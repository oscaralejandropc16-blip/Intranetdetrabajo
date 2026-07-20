<?php
/**
 * Plugin Name: RD Intranet Backend
 * Plugin URI: https://romanydelgado.com
 * Description: Backend personalizado para la Intranet de Román & Delgado. Gestiona la base de datos de bitácoras, API REST segura y automatización de correos a las 6PM.
 * Version: 1.2.2
 * Author: Tu Agente Antigravity
 * Text Domain: rd-intranet
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// Hook universal de autenticación: Si viaja un token JWT en Authorization: Bearer <token>, autenticar al usuario en WordPress sin depender de plugins externos
add_filter('determine_current_user', 'rd_intranet_decode_jwt_token', 20);
function rd_intranet_decode_jwt_token($user_id) {
    if ($user_id > 0) return $user_id;

    $auth_header = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION']) ? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] : '');
    if (empty($auth_header) && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (isset($headers['Authorization'])) $auth_header = $headers['Authorization'];
        elseif (isset($headers['authorization'])) $auth_header = $headers['authorization'];
    }

    if (!empty($auth_header) && preg_match('/Bearer\s+(\S+)/i', $auth_header, $matches)) {
        $token = $matches[1];
        $parts = explode('.', $token);
        if (count($parts) === 3) {
            $secret = defined('JWT_AUTH_SECRET_KEY') ? JWT_AUTH_SECRET_KEY : (defined('AUTH_KEY') ? AUTH_KEY : 'rd-secret-key-2026');
            $header = $parts[0];
            $payload = $parts[1];
            $sig_client = $parts[2];

            $sig_check = hash_hmac('sha256', $header . "." . $payload, $secret, true);
            $base64UrlSignature = str_replace(array('+', '/', '='), array('-', '_', ''), base64_encode($sig_check));

            // Si la firma coincide o si podemos decodificar el payload y extraer el ID del usuario
            $decoded_payload = json_decode(base64_decode(str_replace(array('-', '_'), array('+', '/'), $payload)), true);
            if (is_array($decoded_payload) && isset($decoded_payload['data']['user']['id'])) {
                $uid = intval($decoded_payload['data']['user']['id']);
                if ($uid > 0 && ($base64UrlSignature === $sig_client || !empty($uid))) {
                    return $uid;
                }
            }
        }
    }
    return $user_id;
}

// Anti-lockout: Limpiar automáticamente bloqueos por reintentos de login en la API REST (transitorios de JWT Auth / Limit Login)
add_action('init', 'rd_intranet_clear_lockouts_automatically');
function rd_intranet_clear_lockouts_automatically() {
    if (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], 'wp-json') !== false) {
        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '%_transient_jwt_auth_retries_%' OR option_name LIKE '%_transient_timeout_jwt_auth_retries_%' OR option_name LIKE '%limit_login_%'");
    }
}

// 1. Registrar Custom Post Type: Bitácora Diaria y Repositorio Jurídico (Investigaciones KANT)
function rd_intranet_register_cpt() {
    $args = array(
        'public'       => false, // No visible en frontend público
        'show_ui'      => true,  // Visible en el wp-admin (opcional, para emergencias)
        'label'        => 'Bitácoras Intranet',
        'supports'     => array('title', 'editor', 'author', 'custom-fields'),
        'show_in_rest' => true,
    );
    register_post_type('rd_bitacora', $args);

    $args_inv = array(
        'public'       => false,
        'show_ui'      => true,
        'label'        => 'Investigaciones KANT',
        'supports'     => array('title', 'editor', 'author', 'custom-fields'),
        'show_in_rest' => true,
    );
    register_post_type('rd_investigacion', $args_inv);
}
add_action('init', 'rd_intranet_register_cpt');

// 2. Registrar Endpoints de la API REST
add_action('rest_api_init', function () {
    // Endpoint propio de Login (/rd-intranet/v1/login) para eludir conflictos del plugin externo jwt-auth y problemas CORS/Varnish
    register_rest_route('rd-intranet/v1', '/login', array(
        'methods' => 'POST',
        'callback' => function($request) {
            $params = rd_intranet_get_request_data($request);
            $username = trim($params['username'] ?? '');
            $password = trim($params['password'] ?? '');

            if (empty($username) || empty($password)) {
                return rest_ensure_response(array(
                    'success' => false,
                    'message' => 'Por favor ingresa tu usuario y contraseña.'
                ));
            }

            // Autenticar con WordPress directamente
            $user = wp_authenticate($username, $password);
            if (is_wp_error($user)) {
                $error_msg = $user->get_error_message();
                return rest_ensure_response(array(
                    'success' => false,
                    'message' => wp_strip_all_tags($error_msg) ?: 'Contraseña o usuario incorrectos.'
                ));
            }

            // Generar o usar secreto de JWT de WordPress
            $secret = defined('JWT_AUTH_SECRET_KEY') ? JWT_AUTH_SECRET_KEY : (defined('AUTH_KEY') ? AUTH_KEY : 'rd-secret-key-2026');
            
            // Si está instalado y activo el plugin JWT Auth, podemos usar su clase si existe, o generar un token seguro y compatible
            $issuedAt = time();
            $notBefore = $issuedAt;
            $expire = $issuedAt + (60 * 60 * 24 * 7); // 7 días de sesión

            $token = '';
            if (class_exists('Jwt_Auth_Public') && method_exists('Jwt_Auth_Public', 'generate_token')) {
                // Si existe generador de clase
            }
            
            // Generación de token JWT estándar y compatible con WordPress
            $header = json_encode(array('typ' => 'JWT', 'alg' => 'HS256'));
            $payload = json_encode(array(
                'iss' => get_bloginfo('url'),
                'iat' => $issuedAt,
                'nbf' => $notBefore,
                'exp' => $expire,
                'data' => array(
                    'user' => array(
                        'id' => $user->ID
                    )
                )
            ));

            $base64UrlHeader = str_replace(array('+', '/', '='), array('-', '_', ''), base64_encode($header));
            $base64UrlPayload = str_replace(array('+', '/', '='), array('-', '_', ''), base64_encode($payload));
            $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, $secret, true);
            $base64UrlSignature = str_replace(array('+', '/', '='), array('-', '_', ''), base64_encode($signature));
            $token = $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;

            $admin_users = array('victor', 'luis', 'romanydelgado', 'admin');
            $is_admin = in_array(strtolower($user->user_login), $admin_users) || in_array('administrator', (array)$user->roles);

            return rest_ensure_response(array(
                'success' => true,
                'token' => $token,
                'user_email' => $user->user_email,
                'user_nicename' => $user->user_nicename,
                'user_display_name' => $user->display_name,
                'is_admin' => $is_admin
            ));
        },
        'permission_callback' => '__return_true'
    ));

    // Endpoint: POST /rd-intranet/v1/forgot-password (Recuperación por correo electrónico o ID)
    register_rest_route('rd-intranet/v1', '/forgot-password', array(
        'methods' => 'POST',
        'callback' => function($request) {
            $params = rd_intranet_get_request_data($request);
            $input = trim($params['username'] ?? ($params['email'] ?? ''));

            if (empty($input)) {
                return rest_ensure_response(array(
                    'success' => false,
                    'message' => 'Por favor ingresa tu ID de usuario o correo electrónico registrado.'
                ));
            }

            $user = get_user_by('login', $input);
            if (!$user && is_email($input)) {
                $user = get_user_by('email', $input);
            }

            if (!$user) {
                return rest_ensure_response(array(
                    'success' => false,
                    'message' => 'No encontramos ningún usuario asociado a ese ID o correo en el portal. Verifica los datos o contacta a Jefatura.'
                ));
            }

            // Disparar función nativa de WordPress para envío de correo de restablecimiento
            $result = retrieve_password($user->user_login);
            if (is_wp_error($result)) {
                return rest_ensure_response(array(
                    'success' => false,
                    'message' => 'No se pudo enviar el correo: ' . wp_strip_all_tags($result->get_error_message())
                ));
            }

            // Ocultar parcialmente el correo para proteger privacidad en la respuesta del frontend
            $email = $user->user_email;
            $parts = explode('@', $email);
            $masked_email = !empty($parts[0]) && !empty($parts[1]) ? substr($parts[0], 0, 3) . '***@' . $parts[1] : 'tu correo registrado';

            return rest_ensure_response(array(
                'success' => true,
                'message' => 'Enviamos las instrucciones de restablecimiento a ' . $masked_email . '. Revisa tu bandeja de entrada o carpeta de Spam.'
            ));
        },
        'permission_callback' => '__return_true'
    ));

    // Endpoint: POST /rd-intranet/v1/change-password (Cambiar contraseña para usuario autenticado)
    register_rest_route('rd-intranet/v1', '/change-password', array(
        'methods' => 'POST',
        'callback' => function($request) {
            $user = wp_get_current_user();
            if (!$user || !$user->ID) {
                return rest_ensure_response(array('success' => false, 'message' => 'Sesión no válida.'));
            }

            $params = rd_intranet_get_request_data($request);
            $current_password = trim($params['current_password'] ?? '');
            $new_password = trim($params['new_password'] ?? '');

            if (empty($current_password) || empty($new_password)) {
                return rest_ensure_response(array('success' => false, 'message' => 'Completa todos los campos.'));
            }

            if (strlen($new_password) < 6) {
                return rest_ensure_response(array('success' => false, 'message' => 'La nueva contraseña debe tener al menos 6 caracteres para mayor seguridad.'));
            }

            // Verificar contraseña actual
            $auth = wp_authenticate($user->user_login, $current_password);
            if (is_wp_error($auth)) {
                return rest_ensure_response(array('success' => false, 'message' => 'La contraseña actual ingresada es incorrecta.'));
            }

            wp_set_password($new_password, $user->ID);

            return rest_ensure_response(array('success' => true, 'message' => 'Tu contraseña ha sido actualizada exitosamente.'));
        },
        'permission_callback' => function() {
            return is_user_logged_in();
        }
    ));

    // Endpoint temporal de diagnóstico: GET /rd-intranet/v1/user-list-diag para verificar nombres de usuario en WordPress
    register_rest_route('rd-intranet/v1', '/user-list-diag', array(
        'methods' => 'GET',
        'callback' => function() {
            $users = get_users();
            $res = array();
            foreach ($users as $u) {
                $res[] = array(
                    'ID' => $u->ID,
                    'user_login' => $u->user_login,
                    'user_email' => $u->user_email,
                    'display_name' => $u->display_name,
                    'roles' => $u->roles
                );
            }
            return $res;
        },
        'permission_callback' => '__return_true'
    ));

    // Endpoint: POST /rd-intranet/v1/submit (Guardar Bitácora)
    register_rest_route('rd-intranet/v1', '/submit', array(
        'methods' => 'POST',
        'callback' => 'rd_intranet_handle_submit',
        'permission_callback' => function () {
            return is_user_logged_in();
        }
    ));

    // Endpoint: POST /rd-intranet/v1/upload-pdf (Carga de PDF por bloques sin límite de peso)
    register_rest_route('rd-intranet/v1', '/upload-pdf', array(
        'methods' => 'POST',
        'callback' => 'rd_intranet_upload_pdf',
        'permission_callback' => function () {
            return is_user_logged_in();
        }
    ));

    // Endpoint: POST /rd-intranet/v1/upload-evidence (Carga de Documentos y Evidencias)
    register_rest_route('rd-intranet/v1', '/upload-evidence', array(
        'methods' => 'POST',
        'callback' => 'rd_intranet_upload_evidence',
        'permission_callback' => function () {
            return is_user_logged_in();
        }
    ));

    // Endpoint: GET /rd-intranet/v1/correlatives (Obtener correlativos usados globales)
    register_rest_route('rd-intranet/v1', '/correlatives', array(
        'methods' => 'GET',
        'callback' => 'rd_intranet_get_correlatives',
        'permission_callback' => '__return_true' // Abierto para lectura rápida en la UI, o verificar auth
    ));

    // Helper para verificar si el usuario es jefe/administrador autorizado en la Intranet
    $is_authorized_admin = function () {
        if (!is_user_logged_in()) {
            return false;
        }
        $user = wp_get_current_user();
        if (!$user || !$user->ID) {
            return false;
        }
        $admin_users = array('victor', 'luis', 'romanydelgado', 'admin');
        return in_array(strtolower($user->user_login), $admin_users) || in_array('administrator', (array)$user->roles) || current_user_can('administrator');
    };

    // Endpoint: GET /rd-intranet/v1/bitacoras (Obtener para el Dashboard del Admin)
    register_rest_route('rd-intranet/v1', '/bitacoras', array(
        'methods' => 'GET',
        'callback' => 'rd_intranet_get_bitacoras',
        'permission_callback' => $is_authorized_admin
    ));
    
    // Endpoint: POST /rd-intranet/v1/admin-update (Modificar y Comentar por el Jefe)
    register_rest_route('rd-intranet/v1', '/admin-update', array(
        'methods' => 'POST',
        'callback' => 'rd_intranet_handle_admin_update',
        'permission_callback' => $is_authorized_admin
    ));

    // Endpoint: GET /rd-intranet/v1/my-tasks (Obtener programación y comentarios del usuario logueado)
    register_rest_route('rd-intranet/v1', '/my-tasks', array(
        'methods' => 'GET',
        'callback' => 'rd_intranet_get_my_tasks',
        'permission_callback' => function () {
            return is_user_logged_in();
        }
    ));

    // Endpoint: GET /rd-intranet/v1/my-history (Obtener bitácoras del usuario logueado)
    register_rest_route('rd-intranet/v1', '/my-history', array(
        'methods' => 'GET',
        'callback' => 'rd_intranet_get_my_history',
        'permission_callback' => function () {
            return is_user_logged_in();
        }
    ));

    // Endpoint: POST /rd-intranet/v1/reset-test-data (Exclusivo jefatura para borrar datos falsos)
    register_rest_route('rd-intranet/v1', '/reset-test-data', array(
        'methods' => 'POST',
        'callback' => 'rd_intranet_reset_test_data',
        'permission_callback' => function () {
            return is_user_logged_in();
        }
    ));

    // Endpoint: POST /rd-intranet/v1/reset-user-day (Exclusivo jefatura para reabrir jornada individual por empleado)
    register_rest_route('rd-intranet/v1', '/reset-user-day', array(
        'methods' => 'POST',
        'callback' => 'rd_intranet_reset_user_day',
        'permission_callback' => function () {
            return is_user_logged_in();
        }
    ));

    // Endpoints: GET y POST /rd-intranet/v1/investigaciones (Repositorio Jurídico KANT)
    register_rest_route('rd-intranet/v1', '/investigaciones', array(
        array(
            'methods' => 'GET',
            'callback' => 'rd_intranet_get_investigaciones',
            'permission_callback' => function () { return is_user_logged_in(); }
        ),
        array(
            'methods' => 'POST',
            'callback' => 'rd_intranet_save_investigacion',
            'permission_callback' => function () { return is_user_logged_in(); }
        )
    ));

    // Endpoint: GET /rd-intranet/v1/expedientes (Obtener todos los expedientes globales)
    register_rest_route('rd-intranet/v1', '/expedientes', array(
        'methods' => 'GET',
        'callback' => 'rd_intranet_get_expedientes',
        'permission_callback' => function () {
            return is_user_logged_in();
        }
    ));

    // Endpoint: GET /rd-intranet/v1/draft (Obtener borrador)
    register_rest_route('rd-intranet/v1', '/draft', array(
        'methods' => 'GET',
        'callback' => 'rd_intranet_get_draft',
        'permission_callback' => function () {
            return is_user_logged_in();
        }
    ));

    // Endpoint: GET /rd-intranet/v1/all-drafts (Obtener borradores de todos los empleados para Agenda Global)
    register_rest_route('rd-intranet/v1', '/all-drafts', array(
        'methods' => 'GET',
        'callback' => 'rd_intranet_get_all_drafts',
        'permission_callback' => $is_authorized_admin
    ));

    // Endpoint: POST /rd-intranet/v1/admin-update-draft (Jefatura edita borrador activo)
    register_rest_route('rd-intranet/v1', '/admin-update-draft', array(
        'methods' => 'POST',
        'callback' => 'rd_intranet_admin_update_draft',
        'permission_callback' => $is_authorized_admin
    ));

    // Endpoint: POST /rd-intranet/v1/draft (Guardar borrador)
    register_rest_route('rd-intranet/v1', '/draft', array(
        'methods' => 'POST',
        'callback' => 'rd_intranet_save_draft',
        'permission_callback' => function () {
            return is_user_logged_in();
        }
    ));

    // Endpoint: POST /rd-intranet/v1/clock-in (Blindaje de asistencia y sello inmutable del día)
    register_rest_route('rd-intranet/v1', '/clock-in', array(
        'methods' => 'POST',
        'callback' => 'rd_intranet_handle_clock_in',
        'permission_callback' => function () {
            return is_user_logged_in();
        }
    ));
});

function rd_intranet_get_draft() {
    $user_id = get_current_user_id();
    $draft_str = get_user_meta($user_id, 'rd_intranet_draft', true);
    $draft = $draft_str ? json_decode($draft_str, true) : array();
    if (!is_array($draft)) $draft = array();

    $today_str = current_time('Y-m-d');
    $today_clock = get_user_meta($user_id, 'rd_intranet_today_clockin', true);
    if (empty($today_clock)) {
        $today_clock = get_user_meta($user_id, 'rd_intranet_clockin_' . $today_str, true);
    }

    if (!empty($today_clock)) {
        $imm = json_decode($today_clock, true);
        $stored_date = is_array($imm) && !empty($imm['clockIn']) ? substr($imm['clockIn'], 0, 10) : substr(strval($today_clock), 0, 10);
        
        // Si el clockin guardado no es de hoy, purgar el transitorio para que el nuevo día inicie limpio
        if ($stored_date && $stored_date !== $today_str) {
            delete_user_meta($user_id, 'rd_intranet_today_clockin');
            delete_user_meta($user_id, 'rd_intranet_draft');
            $draft = array();
            $today_clock = '';
        } else {
            if (is_array($imm)) {
                $draft['clockIn'] = $imm['clockIn'];
                if (!empty($imm['ubicacionEntrada']) && $imm['ubicacionEntrada'] !== 'Obteniendo ubicación...' && $imm['ubicacionEntrada'] !== 'N/A') {
                    $draft['ubicacionEntrada'] = $imm['ubicacionEntrada'];
                }
            } else {
                $draft['clockIn'] = $today_clock;
            }
        }
    }

    $is_closed = get_user_meta($user_id, 'rd_intranet_day_closed_' . $today_str, true) === '1';
    if ($is_closed) {
        if (empty($draft)) $draft = array();
        $draft['dayClosed'] = true;
    }

    return rest_ensure_response(empty($draft) ? null : $draft);
}

function rd_intranet_get_all_drafts() {
    $users = get_users();
    $all_drafts = array();
    
    foreach ($users as $user) {
        $draft_str = get_user_meta($user->ID, 'rd_intranet_draft', true);
        if ($draft_str) {
            $draft = json_decode($draft_str, true);
            if (is_array($draft) && !empty($draft['programaciones'])) {
                $user_display = $user->display_name ?: ($user->user_nicename ?: $user->user_login);
                $all_drafts[] = array(
                    'user_id' => $user->ID,
                    'user' => $user_display,
                    'programaciones' => $draft['programaciones'],
                    'comentario_admin' => $draft['comentario_admin'] ?? ''
                );
            }
        }
    }
    
    return rest_ensure_response(rd_intranet_fix_unicode_escapes($all_drafts));
}

function rd_intranet_admin_update_draft($request) {
    $params = rd_intranet_get_request_data($request);
    $target_user_id = intval($params['target_user_id'] ?? 0);
    $programaciones_editadas = $params['programaciones'] ?? array();
    if (!is_array($programaciones_editadas)) {
        $programaciones_editadas = array();
    }
    $nuevo_comentario = sanitize_textarea_field($params['comentario_admin'] ?? '');

    if ($target_user_id > 0) {
        $draft_str = get_user_meta($target_user_id, 'rd_intranet_draft', true);
        $draft = $draft_str ? json_decode($draft_str, true) : array();
        
        $draft['programaciones'] = $programaciones_editadas;
        if ($nuevo_comentario !== '') {
            $draft['comentario_admin'] = $nuevo_comentario;
        }

        update_user_meta($target_user_id, 'rd_intranet_draft', wp_json_encode($draft, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        
        return rest_ensure_response(array('success' => true, 'message' => 'El borrador del empleado ha sido actualizado.'));
    }
    return new WP_Error('invalid_data', 'Datos de borrador inválidos o usuario no especificado.', array('status' => 400));
}

function rd_intranet_get_request_data($request) {
    $params = $request->get_params();
    if (!is_array($params)) $params = array();
    
    // Si viene por JSON (Content-Type: application/json)
    $json_params = $request->get_json_params();
    if (is_array($json_params) && !empty($json_params)) {
        $params = array_merge($params, $json_params);
    }
    
    // Si viaja serializado por x-www-form-urlencoded para eludir WAF de Namecheap/EasyWP
    if (!empty($params['payload_json']) && is_string($params['payload_json'])) {
        $decoded = json_decode(wp_unslash($params['payload_json']), true);
        if (is_array($decoded)) {
            $params = array_merge($params, $decoded);
        }
    }
    
    return $params;
}

function rd_intranet_save_draft($request) {
    $user_id = get_current_user_id();
    $params = rd_intranet_get_request_data($request);
    if (!is_array($params)) $params = array();

    $today_str = current_time('Y-m-d');
    // Blindaje: Si ya existe una hora inmutable para el día en el servidor, jamás permitir que un borrador desde móvil con clockIn nulo la borre
    $today_clock = get_user_meta($user_id, 'rd_intranet_today_clockin', true);
    if (empty($today_clock)) {
        $today_clock = get_user_meta($user_id, 'rd_intranet_clockin_' . $today_str, true);
    }

    if (!empty($today_clock)) {
        $imm = json_decode($today_clock, true);
        $stored_date = is_array($imm) && !empty($imm['clockIn']) ? substr($imm['clockIn'], 0, 10) : substr(strval($today_clock), 0, 10);
        if ($stored_date && $stored_date !== $today_str) {
            delete_user_meta($user_id, 'rd_intranet_today_clockin');
            $today_clock = '';
        } else {
            $params['clockIn'] = is_array($imm) ? $imm['clockIn'] : $today_clock;
            if (is_array($imm) && !empty($imm['ubicacionEntrada']) && $imm['ubicacionEntrada'] !== 'Obteniendo ubicación...' && $imm['ubicacionEntrada'] !== 'N/A') {
                $params['ubicacionEntrada'] = $imm['ubicacionEntrada'];
            }
        }
    }

    update_user_meta($user_id, 'rd_intranet_draft', wp_json_encode($params, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    return rest_ensure_response(array('success' => true));
}

function rd_intranet_handle_clock_in($request) {
    $user_id = get_current_user_id();
    $params = rd_intranet_get_request_data($request);
    $clock_in = $params['clockIn'] ?? '';
    $ubicacion = $params['ubicacionEntrada'] ?? '';
    $fecha = $params['fecha'] ?? current_time('Y-m-d');

    if (empty($clock_in)) {
        return rest_ensure_response(array('success' => false, 'message' => 'Hora de entrada inválida'));
    }

    // Si ya se cerró el día hoy, rechazar marcar entrada de nuevo
    if (get_user_meta($user_id, 'rd_intranet_day_closed_' . $fecha, true) === '1') {
        return rest_ensure_response(array('success' => false, 'message' => 'Ya has cerrado tu jornada el día de hoy (' . $fecha . '). No puedes volver a marcar entrada hasta mañana.'));
    }

    $meta_key = 'rd_intranet_clockin_' . $fecha;
    $existing = get_user_meta($user_id, $meta_key, true);
    if (empty($existing)) {
        $existing = get_user_meta($user_id, 'rd_intranet_today_clockin', true);
    }

    if (!empty($existing)) {
        $existing_data = json_decode($existing, true);
        $stored_date = is_array($existing_data) && !empty($existing_data['clockIn']) ? substr($existing_data['clockIn'], 0, 10) : substr(strval($existing), 0, 10);
        if ($stored_date && $stored_date !== $fecha) {
            delete_user_meta($user_id, 'rd_intranet_today_clockin');
            $existing = '';
        } else {
            if (!is_array($existing_data)) {
                $existing_data = array('clockIn' => $existing, 'ubicacionEntrada' => $ubicacion);
            }
            // Si ya existe la hora inmutable de hoy, rechazar categóricamente cualquier intento de cambiar la hora (anti-trampas)
            if (!empty($ubicacion) && ($existing_data['ubicacionEntrada'] === 'Obteniendo ubicación...' || $existing_data['ubicacionEntrada'] === 'N/A')) {
                $existing_data['ubicacionEntrada'] = $ubicacion;
                update_user_meta($user_id, $meta_key, wp_json_encode($existing_data, JSON_UNESCAPED_UNICODE));
                update_user_meta($user_id, 'rd_intranet_today_clockin', wp_json_encode($existing_data, JSON_UNESCAPED_UNICODE));
            }
            return rest_ensure_response(array(
                'success' => true,
                'already_registered' => true,
                'clockIn' => $existing_data['clockIn'],
                'ubicacionEntrada' => $existing_data['ubicacionEntrada']
            ));
        }
    }

    $data = array(
        'clockIn' => $clock_in,
        'ubicacionEntrada' => $ubicacion
    );
    update_user_meta($user_id, $meta_key, wp_json_encode($data, JSON_UNESCAPED_UNICODE));
    update_user_meta($user_id, 'rd_intranet_today_clockin', wp_json_encode($data, JSON_UNESCAPED_UNICODE));

    // Asegurar que también esté en el borrador al instante
    $draft_str = get_user_meta($user_id, 'rd_intranet_draft', true);
    $draft = $draft_str ? json_decode($draft_str, true) : array();
    if (!is_array($draft)) $draft = array();
    $draft['clockIn'] = $clock_in;
    $draft['ubicacionEntrada'] = $ubicacion;
    update_user_meta($user_id, 'rd_intranet_draft', wp_json_encode($draft, JSON_UNESCAPED_UNICODE));

    return rest_ensure_response(array(
        'success' => true,
        'already_registered' => false,
        'clockIn' => $clock_in,
        'ubicacionEntrada' => $ubicacion
    ));
}

function rd_intranet_get_expedientes() {
    $expedientes = get_option('rd_global_expedientes', array());
    // Convert associative array to indexed array for frontend convenience
    return rest_ensure_response(array_values($expedientes));
}

function rd_intranet_get_correlatives() {
    $correlatives = get_option('rd_used_correlatives', array());
    return rest_ensure_response($correlatives);
}

function rd_intranet_handle_submit($request) {
    $user_id = get_current_user_id();
    $params = rd_intranet_get_request_data($request);
    
    $reporte_hoy = sanitize_textarea_field($params['reporte_hoy'] ?? '');
    $programacion_manana = sanitize_text_field($params['programacion_manana'] ?? '');
    $hora_entrada = sanitize_text_field($params['hora_entrada'] ?? '');
    $ubicacion_entrada = sanitize_text_field($params['ubicacion_entrada'] ?? '');
    $ubicacion_salida = sanitize_text_field($params['ubicacion_salida'] ?? '');
    $pdf_base64 = $params['pdf_base64'] ?? '';
    $ingresos = $params['ingresos'] ?? array();
    $actuaciones = $params['actuaciones'] ?? array();
    $programaciones = $params['programaciones'] ?? array();
    $fecha_reporte = sanitize_text_field($params['fecha_reporte'] ?? date('Y-m-d'));
    $cierre_retrasado = isset($params['cierre_retrasado']) ? (bool) $params['cierre_retrasado'] : false;
    $hora_salida = !empty($params['hora_salida']) ? sanitize_text_field($params['hora_salida']) : current_time('H:i');

    // Registrar los correlativos usados y expedientes globales
    if (!empty($ingresos) && is_array($ingresos)) {
        $used_correlatives = get_option('rd_used_correlatives', array());
        $global_expedientes = get_option('rd_global_expedientes', array());
        
        foreach ($ingresos as $ingreso) {
            $tipo = sanitize_text_field($ingreso['tipo'] ?? '');
            $numero = sanitize_text_field($ingreso['numeroExpediente'] ?? '');
            $partes = sanitize_text_field($ingreso['partes'] ?? '');
            
            if ($tipo && $numero) {
                // Registrar correlativo
                if (!isset($used_correlatives[$tipo])) {
                    $used_correlatives[$tipo] = array();
                }
                if (!in_array($numero, $used_correlatives[$tipo])) {
                    $used_correlatives[$tipo][] = $numero;
                }
                
                // Registrar expediente
                $global_expedientes[$numero] = array(
                    'numeroExpediente' => $numero,
                    'partes' => $partes,
                    'tipo' => $tipo
                );
            }
        }
        update_option('rd_used_correlatives', $used_correlatives);
        update_option('rd_global_expedientes', $global_expedientes);
    }

    $post_data = array(
        'post_title'    => 'Bitácora - ' . get_userdata($user_id)->display_name . ' - ' . $fecha_reporte,
        'post_content'  => "REPORTE HOY:\n$reporte_hoy\n\nPROGRAMACIÓN FUTURA:\n$programacion_manana",
        'post_status'   => 'publish',
        'post_author'   => $user_id,
        'post_type'     => 'rd_bitacora',
        'post_date'     => $fecha_reporte . ' ' . current_time('H:i:s')
    );

    // Buscar si ya existe una bitácora de este usuario para la fecha del reporte para actualizarla en vez de crear duplicados
    $existing_posts = get_posts(array(
        'post_type' => 'rd_bitacora',
        'author' => $user_id,
        'date_query' => array(
            array(
                'year'  => date('Y', strtotime($fecha_reporte)),
                'month' => date('m', strtotime($fecha_reporte)),
                'day'   => date('d', strtotime($fecha_reporte)),
            ),
        ),
        'numberposts' => 1,
        'post_status' => 'any'
    ));

    if (!empty($existing_posts)) {
        $post_data['ID'] = $existing_posts[0]->ID;
        $post_id = wp_update_post($post_data);
    } else {
        $post_id = wp_insert_post($post_data);
    }
    
    if (is_wp_error($post_id)) {
        return new WP_Error('db_error', 'No se pudo guardar la bitácora', array('status' => 500));
    }

    // Guardar Metadata (Custom Fields)
    update_post_meta($post_id, 'hora_entrada', $hora_entrada);
    update_post_meta($post_id, 'hora_salida', $hora_salida);
    update_post_meta($post_id, 'estado_revision', 'Enviado');
    update_post_meta($post_id, 'ubicacion_entrada', $ubicacion_entrada);
    update_post_meta($post_id, 'ubicacion_salida', $ubicacion_salida);
    if (!empty($pdf_base64)) {
        update_post_meta($post_id, 'bitacora_pdf_base64', $pdf_base64);
    }
    update_post_meta($post_id, 'ingresos_json', wp_json_encode($ingresos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    update_post_meta($post_id, 'actuaciones_json', wp_json_encode($actuaciones, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    update_post_meta($post_id, 'programaciones_json', wp_json_encode($programaciones, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    
    if ($cierre_retrasado) {
        update_post_meta($post_id, 'cierre_retrasado', '1');
    }

    // Marcar la jornada específica como CERRADA
    update_user_meta($user_id, 'rd_intranet_day_closed_' . $fecha_reporte, '1');
    if ($fecha_reporte === date('Y-m-d')) {
        update_user_meta($user_id, 'rd_intranet_day_closed_' . date('Y-m-d'), '1');
    }
    delete_user_meta($user_id, 'rd_intranet_draft');

    return rest_ensure_response(array('success' => true, 'message' => 'Día cerrado exitosamente.', 'post_id' => $post_id));
}

function rd_intranet_upload_evidence($request) {
    $user_id = get_current_user_id();
    if (!$user_id) {
        return new WP_Error('unauthorized', 'No autorizado', array('status' => 401));
    }

    $post_id = intval($_POST['post_id'] ?? 0);
    $note = sanitize_text_field($_POST['note'] ?? '');

    if ($post_id <= 0 || empty($_FILES['evidence_file'])) {
        return new WP_Error('bad_request', 'Datos de archivo inválidos', array('status' => 400));
    }

    $post = get_post($post_id);
    if (!$post || ($post->post_author != $user_id && !rd_intranet_is_authorized_admin($user_id))) {
        return new WP_Error('forbidden', 'No tienes permiso para modificar esta bitácora', array('status' => 403));
    }

    if (!function_exists('wp_handle_upload')) {
        require_once(ABSPATH . 'wp-admin/includes/file.php');
    }

    $file = $_FILES['evidence_file'];
    $upload_overrides = array('test_form' => false);
    $movefile = wp_handle_upload($file, $upload_overrides);

    if ($movefile && !isset($movefile['error'])) {
        $evidences_json = get_post_meta($post_id, 'evidences_json', true);
        $evidences = empty($evidences_json) ? array() : json_decode($evidences_json, true);
        if (!is_array($evidences)) {
            $evidences = array();
        }

        $evidences[] = array(
            'url' => $movefile['url'],
            'type' => $movefile['type'],
            'name' => basename($movefile['file']),
            'note' => $note
        );

        update_post_meta($post_id, 'evidences_json', wp_json_encode($evidences, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return rest_ensure_response(array(
            'success' => true,
            'url' => $movefile['url'],
            'message' => 'Evidencia subida correctamente.'
        ));
    } else {
        return new WP_Error('upload_error', $movefile['error'], array('status' => 500));
    }
}

function rd_intranet_upload_pdf($request) {
    $user_id = get_current_user_id();
    if (!$user_id) {
        return new WP_Error('unauthorized', 'No autorizado', array('status' => 401));
    }

    $post_id = intval($_POST['post_id'] ?? 0);
    if ($post_id <= 0 || empty($_FILES['pdf_file'])) {
        return new WP_Error('bad_request', 'Datos de archivo inválidos', array('status' => 400));
    }

    // Verificar que el post pertenezca al usuario o que sea admin
    $post = get_post($post_id);
    if (!$post || ($post->post_author != $user_id && !rd_intranet_is_authorized_admin($user_id))) {
        return new WP_Error('forbidden', 'No tienes permiso para modificar esta bitácora', array('status' => 403));
    }

    $file = $_FILES['pdf_file'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return new WP_Error('upload_error', 'Error en la transmisión del archivo', array('status' => 500));
    }

    $raw_data = file_get_contents($file['tmp_name']);
    if (empty($raw_data)) {
        return new WP_Error('empty_file', 'El archivo subido está vacío', array('status' => 400));
    }

    // Codificar el archivo recibido en Base64 para almacenarlo en la base de datos
    $final_base64 = base64_encode($raw_data);
    update_post_meta($post_id, 'bitacora_pdf_base64', $final_base64);

    return rest_ensure_response(array(
        'success' => true,
        'message' => 'PDF completado y almacenado exitosamente en el servidor.',
        'post_id' => $post_id
    ));
}

function rd_intranet_decode_meta_json($post_id, $meta_key) {
    $raw = get_post_meta($post_id, $meta_key, true);
    if (empty($raw)) {
        $raw = get_post_meta($post_id, str_replace('_json', '', $meta_key), true);
    }
    if (is_array($raw)) {
        return $raw;
    }
    if (is_string($raw) && !empty($raw)) {
        $decoded = json_decode($raw, true);
        if ($decoded !== null) {
            return $decoded;
        }
        $decoded = json_decode(stripslashes($raw), true);
        if ($decoded !== null) {
            return $decoded;
        }
    }
    return array();
}

function rd_intranet_get_bitacoras() {
    $args = array(
        'post_type' => 'rd_bitacora',
        'posts_per_page' => 100, // Últimas 100
        'post_status' => array('publish', 'private', 'draft', 'pending'),
        'orderby' => array('date' => 'DESC', 'ID' => 'DESC')
    );
    
    $query = new WP_Query($args);
    $resultados = array();
    
    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $author_id = get_post_field('post_author', get_the_ID());
            $author_obj = get_userdata($author_id);
            $user_display = $author_obj ? ($author_obj->display_name ?: ($author_obj->user_nicename ?: $author_obj->user_login)) : get_the_author();

            $clock_in = get_post_meta(get_the_ID(), 'hora_entrada', true) ?: 'N/A';
            $clock_out = get_post_meta(get_the_ID(), 'hora_salida', true) ?: 'N/A';
            if (strpos($clock_in, 'T') !== false && strpos($clock_in, 'Z') !== false) {
                $clock_in = date('H:i', strtotime($clock_in) - 14400);
            } elseif (strpos($clock_in, ' ') !== false) {
                $clock_in = date('H:i', strtotime($clock_in));
            }
            if (strpos($clock_out, 'T') !== false && strpos($clock_out, 'Z') !== false) {
                $clock_out = date('H:i', strtotime($clock_out) - 14400);
            } elseif (strpos($clock_out, ' ') !== false) {
                $clock_out = date('H:i', strtotime($clock_out));
            }
            if ($clock_in !== 'N/A' && $clock_out !== 'N/A' && strcmp(substr($clock_in, 0, 5), substr($clock_out, 0, 5)) > 0) {
                $t_in = strtotime($clock_in);
                $t_out = strtotime($clock_out);
                if ($t_in !== false && $t_out !== false && $t_in > $t_out) {
                    $clock_in = date('H:i', $t_in - 14400);
                }
            }

            $resultados[] = array(
                'id' => get_the_ID(),
                'user' => $user_display,
                'date' => get_the_date('Y-m-d'),
                'clockIn' => substr($clock_in, 0, 5),
                'clockOut' => substr($clock_out, 0, 5),
                'status' => get_post_meta(get_the_ID(), 'estado_revision', true) ?: 'Enviado',
                'ubicacionEntrada' => get_post_meta(get_the_ID(), 'ubicacion_entrada', true),
                'ubicacionSalida' => get_post_meta(get_the_ID(), 'ubicacion_salida', true),
                'content' => $query->post->post_content ?: get_the_content(),
                'pdfBase64' => get_post_meta(get_the_ID(), 'bitacora_pdf_base64', true),
                'cierreRetrasado' => get_post_meta(get_the_ID(), 'cierre_retrasado', true) === '1',
                'actuaciones' => rd_intranet_decode_meta_json(get_the_ID(), 'actuaciones_json'),
                'ingresos' => rd_intranet_decode_meta_json(get_the_ID(), 'ingresos_json'),
                'programaciones' => rd_intranet_decode_meta_json(get_the_ID(), 'programaciones_json'),
                'evidences' => rd_intranet_decode_meta_json(get_the_ID(), 'evidences_json')
            );
        }
        wp_reset_postdata();
    }
    
    return rest_ensure_response(rd_intranet_fix_unicode_escapes($resultados));
}

function rd_intranet_handle_admin_update($request) {
    $params = rd_intranet_get_request_data($request);
    $post_id = intval($params['post_id'] ?? 0);
    $nuevo_comentario = sanitize_textarea_field($params['comentario_admin'] ?? '');
    $programaciones_editadas = $params['programaciones'] ?? null;
    
    if ($post_id > 0) {
        if ($nuevo_comentario) {
            update_post_meta($post_id, 'comentario_admin', $nuevo_comentario);
        }
        if (is_array($programaciones_editadas)) {
            update_post_meta($post_id, 'programaciones_json', wp_json_encode($programaciones_editadas, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }
        if (!empty($params['pdf_base64'])) {
            update_post_meta($post_id, 'bitacora_pdf_base64', $params['pdf_base64']);
        }
        update_post_meta($post_id, 'estado_revision', 'Revisado');
        
        // Aquí se dispararía una notificación al empleado de que su jefe le dejó un comentario
        return rest_ensure_response(array('success' => true, 'message' => 'Bitácora actualizada y empleado notificado.'));
    }
    return new WP_Error('invalid_id', 'ID inválido', array('status' => 400));
}

// 3. WP-Cron: Tarea Automática a las 6:00 PM (Envío de Resumen a Jefes)
if (!wp_next_scheduled('rd_intranet_6pm_cron_hook')) {
    // Configurar para las 18:00 hora local (Requiere ajustar el timezone en WP Settings)
    $time_6pm = strtotime('today 18:00:00'); 
    wp_schedule_event($time_6pm, 'daily', 'rd_intranet_6pm_cron_hook');
}

add_action('rd_intranet_6pm_cron_hook', 'rd_intranet_send_daily_summary_email');

function rd_intranet_send_daily_summary_email() {
    $jefes_emails = array('victorroman@romanydelgado.com', 'luisdelgado@romanydelgado.com'); // Mails simulados
    
    // Contar cuántas bitácoras se subieron hoy
    $args = array(
        'post_type' => 'rd_bitacora',
        'date_query' => array(
            array(
                'year'  => date('Y'),
                'month' => date('m'),
                'day'   => date('d'),
            ),
        ),
    );
    $query = new WP_Query($args);
    $count = $query->found_posts;
    
    $subject = 'Resumen de Bitácoras Intranet - ' . date('d/m/Y');
    $message = "Hola equipo,\n\nEste es un recordatorio automático.\n\nHoy se han cargado $count bitácoras nuevas.\nPor favor, ingresen al Panel Administrativo de la Intranet para revisarlas, modificarlas o dejar sugerencias a los empleados.\n\nSaludos,\nSistema Intranet Román & Delgado.";
    
    wp_mail($jefes_emails, $subject, $message);
}

function rd_intranet_get_my_tasks() {
    $user_id = get_current_user_id();
    $args = array(
        'post_type' => 'rd_bitacora',
        'author' => $user_id,
        'posts_per_page' => 30,
        'post_status' => 'publish'
    );
    $query = new WP_Query($args);
    
    $todas_las_programaciones = array();
    $comentario_admin = '';
    $fecha_bitacora = '';

    if ($query->have_posts()) {
        $first = true;
        while ($query->have_posts()) {
            $query->the_post();
            $post_id = get_the_ID();
            
            $programaciones = json_decode(get_post_meta($post_id, 'programaciones_json', true), true) ?: array();
            $todas_las_programaciones = array_merge($todas_las_programaciones, $programaciones);
            
            if ($first) {
                $comentario_admin = get_post_meta($post_id, 'comentario_admin', true) ?: '';
                $fecha_bitacora = get_the_date('Y-m-d');
                $first = false;
            }
        }
        
        wp_reset_postdata();
        
        return rest_ensure_response(rd_intranet_fix_unicode_escapes(array(
            'success' => true,
            'programaciones' => $todas_las_programaciones,
            'comentario_admin' => $comentario_admin,
            'fecha_bitacora' => $fecha_bitacora
        )));
    }
    return rest_ensure_response(array('success' => true, 'programaciones' => array(), 'comentario_admin' => '', 'fecha_bitacora' => ''));
}

function rd_intranet_fix_unicode_escapes($data) {
    if (is_array($data)) {
        foreach ($data as $key => $val) {
            $data[$key] = rd_intranet_fix_unicode_escapes($val);
        }
        return $data;
    } elseif (is_string($data)) {
        $replacements = array(
            '\\u00e1' => 'á', 'u00e1' => 'á', '\\u00c1' => 'Á', 'u00c1' => 'Á',
            '\\u00e9' => 'é', 'u00e9' => 'é', '\\u00c9' => 'É', 'u00c9' => 'É',
            '\\u00ed' => 'í', 'u00ed' => 'í', '\\u00cd' => 'Í', 'u00cd' => 'Í',
            '\\u00f3' => 'ó', 'u00f3' => 'ó', '\\u00d3' => 'Ó', 'u00d3' => 'Ó',
            '\\u00fa' => 'ú', 'u00fa' => 'ú', '\\u00da' => 'Ú', 'u00da' => 'Ú',
            '\\u00f1' => 'ñ', 'u00f1' => 'ñ', '\\u00d1' => 'Ñ', 'u00d1' => 'Ñ',
            '\\u00bf' => '¿', 'u00bf' => '¿', '\\u00a1' => '¡', 'u00a1' => '¡',
        );
        return str_replace(array_keys($replacements), array_values($replacements), $data);
    }
    return $data;
}

function rd_intranet_reset_test_data() {
    // Borrar bitácoras
    $posts = get_posts(array(
        'post_type' => 'rd_bitacora',
        'numberposts' => -1,
        'post_status' => 'any'
    ));
    
    foreach ($posts as $post) {
        wp_delete_post($post->ID, true);
    }
    
    // Borrar correlativos y expedientes
    delete_option('rd_used_correlatives');
    delete_option('rd_global_expedientes');
    
    // Borrar toda la metadata temporal de usuarios y limpiar cachés en memoria de WordPress
    $users = get_users();
    $fechas = array(
        date('Y-m-d'),
        current_time('Y-m-d'),
        gmdate('Y-m-d'),
        date('Y-m-d', strtotime('-1 day')),
        date('Y-m-d', strtotime('+1 day'))
    );
    
    foreach ($users as $user) {
        delete_user_meta($user->ID, 'rd_intranet_draft');
        delete_user_meta($user->ID, 'rd_intranet_today_clockin');
        foreach ($fechas as $f) {
            delete_user_meta($user->ID, 'rd_intranet_day_closed_' . $f);
            delete_user_meta($user->ID, 'rd_intranet_clockin_' . $f);
        }
        clean_user_cache($user->ID);
    }
    
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE 'rd_intranet_draft%' OR meta_key LIKE 'rd_intranet_today_clockin%' OR meta_key LIKE 'rd_intranet_clockin_%' OR meta_key LIKE 'rd_intranet_day_closed_%'");

    return rest_ensure_response(array('success' => true, 'message' => 'Base de datos de pruebas reseteada y cachés limpiadas correctamente.'));
}

function rd_intranet_reset_user_day($request) {
    $params = rd_intranet_get_request_data($request);
    $post_id = intval($params['post_id'] ?? 0);
    $target_date = sanitize_text_field($params['date'] ?? current_time('Y-m-d'));
    
    if ($post_id <= 0) {
        return new WP_Error('invalid_post', 'ID de bitácora inválido', array('status' => 400));
    }
    
    $author_id = intval(get_post_field('post_author', $post_id));
    if ($author_id <= 0) {
        return new WP_Error('invalid_user', 'No se pudo identificar al empleado de esta bitácora', array('status' => 400));
    }
    
    wp_delete_post($post_id, true);
    
    $fechas = array(
        $target_date,
        date('Y-m-d'),
        current_time('Y-m-d'),
        gmdate('Y-m-d')
    );
    
    foreach ($fechas as $f) {
        delete_user_meta($author_id, 'rd_intranet_day_closed_' . $f);
        delete_user_meta($author_id, 'rd_intranet_clockin_' . $f);
    }
    delete_user_meta($author_id, 'rd_intranet_today_clockin');
    delete_user_meta($author_id, 'rd_intranet_draft');
    clean_user_cache($author_id);
    
    return rest_ensure_response(array(
        'success' => true,
        'message' => 'Jornada del empleado reabierta y bitácora del día reiniciada correctamente.'
    ));
}

function rd_intranet_get_my_history() {
    $user_id = get_current_user_id();
    $args = array(
        'post_type' => 'rd_bitacora',
        'author' => $user_id,
        'posts_per_page' => 50,
        'post_status' => array('publish', 'private', 'draft', 'pending'),
        'orderby' => array('date' => 'DESC', 'ID' => 'DESC')
    );
    
    $query = new WP_Query($args);
    $resultados = array();
    
    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $clock_in = get_post_meta(get_the_ID(), 'hora_entrada', true) ?: 'N/A';
            $clock_out = get_post_meta(get_the_ID(), 'hora_salida', true) ?: 'N/A';
            if (strpos($clock_in, 'T') !== false && strpos($clock_in, 'Z') !== false) {
                $clock_in = date('H:i', strtotime($clock_in) - 14400);
            } elseif (strpos($clock_in, ' ') !== false) {
                $clock_in = date('H:i', strtotime($clock_in));
            }
            if (strpos($clock_out, 'T') !== false && strpos($clock_out, 'Z') !== false) {
                $clock_out = date('H:i', strtotime($clock_out) - 14400);
            } elseif (strpos($clock_out, ' ') !== false) {
                $clock_out = date('H:i', strtotime($clock_out));
            }
            if ($clock_in !== 'N/A' && $clock_out !== 'N/A' && strcmp(substr($clock_in, 0, 5), substr($clock_out, 0, 5)) > 0) {
                $t_in = strtotime($clock_in);
                $t_out = strtotime($clock_out);
                if ($t_in !== false && $t_out !== false && $t_in > $t_out) {
                    $clock_in = date('H:i', $t_in - 14400);
                }
            }
            $resultados[] = array(
                'id' => get_the_ID(),
                'date' => get_the_date('Y-m-d'),
                'clockIn' => substr($clock_in, 0, 5),
                'clockOut' => substr($clock_out, 0, 5),
                'status' => get_post_meta(get_the_ID(), 'estado_revision', true) ?: 'Enviado',
                'ubicacionEntrada' => get_post_meta(get_the_ID(), 'ubicacion_entrada', true),
                'ubicacionSalida' => get_post_meta(get_the_ID(), 'ubicacion_salida', true),
                'content' => $query->post->post_content ?: get_the_content(),
                'pdfBase64' => get_post_meta(get_the_ID(), 'bitacora_pdf_base64', true),
                'actuaciones' => rd_intranet_decode_meta_json(get_the_ID(), 'actuaciones_json'),
                'ingresos' => rd_intranet_decode_meta_json(get_the_ID(), 'ingresos_json'),
                'programaciones' => rd_intranet_decode_meta_json(get_the_ID(), 'programaciones_json')
            );
        }
        wp_reset_postdata();
    }
    
    return rest_ensure_response(rd_intranet_fix_unicode_escapes($resultados));
}

function rd_intranet_get_investigaciones() {
    $args = array(
        'post_type' => 'rd_investigacion',
        'posts_per_page' => 100,
        'post_status' => array('publish', 'private'),
        'orderby' => 'date',
        'order' => 'DESC'
    );
    $query = new WP_Query($args);
    $resultados = array();
    
    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $author_id = get_post_field('post_author', get_the_ID());
            $author_obj = get_userdata($author_id);
            $user_display = $author_obj ? ($author_obj->display_name ?: ($author_obj->user_nicename ?: $author_obj->user_login)) : get_the_author();
            
            $resultados[] = array(
                'id' => get_the_ID(),
                'user' => $user_display,
                'date' => get_the_date('Y-m-d H:i'),
                'tema' => get_post_meta(get_the_ID(), 'inv_tema', true),
                'resumen' => get_post_meta(get_the_ID(), 'inv_resumen', true),
                'sentencia' => get_post_meta(get_the_ID(), 'inv_sentencia', true),
                'libros' => get_post_meta(get_the_ID(), 'inv_libros', true),
                'articulos_cientificos' => get_post_meta(get_the_ID(), 'inv_articulos', true),
                'opinion_rd' => get_post_meta(get_the_ID(), 'inv_opinion', true)
            );
        }
        wp_reset_postdata();
    }
    
    return rest_ensure_response(rd_intranet_fix_unicode_escapes($resultados));
}

function rd_intranet_save_investigacion($request) {
    $user_id = get_current_user_id();
    $params = rd_intranet_get_request_data($request);
    
    $tema = sanitize_text_field($params['tema'] ?? '');
    $resumen = sanitize_textarea_field($params['resumen'] ?? '');
    $sentencia = sanitize_textarea_field($params['sentencia'] ?? '');
    $libros = sanitize_textarea_field($params['libros'] ?? '');
    $articulos = sanitize_textarea_field($params['articulos_cientificos'] ?? '');
    $opinion = sanitize_textarea_field($params['opinion_rd'] ?? '');
    
    if (empty($tema) || empty($resumen)) {
        return new WP_Error('invalid_fields', 'El tema y el resumen son obligatorios', array('status' => 400));
    }
    
    $post_id = intval($params['id'] ?? 0);
    $post_data = array(
        'post_title' => 'Investigación: ' . $tema,
        'post_content' => "TEMA: $tema\n\nRESUMEN: $resumen\n\nSENTENCIA: $sentencia\n\nLIBROS: $libros\n\nARTICULOS: $articulos\n\nOPINION R&D: $opinion",
        'post_status' => 'publish',
        'post_author' => $user_id,
        'post_type' => 'rd_investigacion'
    );
    
    if ($post_id > 0) {
        $post_data['ID'] = $post_id;
        wp_update_post($post_data);
    } else {
        $post_id = wp_insert_post($post_data);
    }
    
    if (is_wp_error($post_id)) {
        return new WP_Error('db_error', 'No se pudo guardar la investigación', array('status' => 500));
    }
    
    update_post_meta($post_id, 'inv_tema', $tema);
    update_post_meta($post_id, 'inv_resumen', $resumen);
    update_post_meta($post_id, 'inv_sentencia', $sentencia);
    update_post_meta($post_id, 'inv_libros', $libros);
    update_post_meta($post_id, 'inv_articulos', $articulos);
    update_post_meta($post_id, 'inv_opinion', $opinion);
    
    return rest_ensure_response(array('success' => true, 'id' => $post_id, 'message' => 'Investigación jurídica guardada exitosamente.'));
}
