<?php
/**
 * Plugin Name: RD Intranet Backend
 * Plugin URI: https://romanydelgado.com
 * Description: Backend personalizado para la Intranet de Román & Delgado. Gestiona la base de datos de bitácoras, API REST segura y automatización de correos a las 6PM.
 * Version: 1.0.0
 * Author: Tu Agente Antigravity
 * Text Domain: rd-intranet
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// 1. Registrar Custom Post Type: Bitácora Diaria
function rd_intranet_register_cpt() {
    $args = array(
        'public'       => false, // No visible en frontend público
        'show_ui'      => true,  // Visible en el wp-admin (opcional, para emergencias)
        'label'        => 'Bitácoras Intranet',
        'supports'     => array('title', 'editor', 'author', 'custom-fields'),
        'show_in_rest' => true,
    );
    register_post_type('rd_bitacora', $args);
}
add_action('init', 'rd_intranet_register_cpt');

// 2. Registrar Endpoints de la API REST
add_action('rest_api_init', function () {
    
    // Endpoint: POST /rd-intranet/v1/submit (Guardar Bitácora)
    register_rest_route('rd-intranet/v1', '/submit', array(
        'methods' => 'POST',
        'callback' => 'rd_intranet_handle_submit',
        'permission_callback' => function () {
            // Requiere usuario logueado (verificado vía JWT plugin)
            return is_user_logged_in();
        }
    ));

    // Endpoint: GET /rd-intranet/v1/correlatives (Obtener correlativos usados globales)
    register_rest_route('rd-intranet/v1', '/correlatives', array(
        'methods' => 'GET',
        'callback' => 'rd_intranet_get_correlatives',
        'permission_callback' => '__return_true' // Abierto para lectura rápida en la UI, o verificar auth
    ));

    // Endpoint: GET /rd-intranet/v1/bitacoras (Obtener para el Dashboard del Admin)
    register_rest_route('rd-intranet/v1', '/bitacoras', array(
        'methods' => 'GET',
        'callback' => 'rd_intranet_get_bitacoras',
        'permission_callback' => function () {
            // Solo los jefes pueden ver esto
            return current_user_can('administrator'); 
        }
    ));
    
    // Endpoint: POST /rd-intranet/v1/admin-update (Modificar y Comentar por el Jefe)
    register_rest_route('rd-intranet/v1', '/admin-update', array(
        'methods' => 'POST',
        'callback' => 'rd_intranet_handle_admin_update',
        'permission_callback' => function () {
            return current_user_can('administrator'); 
        }
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

    // Blindaje horaria multi-dispositivo universal: Buscar primero por la llave del día en curso sin depender de husos horarios ni formato
    $today_clock = get_user_meta($user_id, 'rd_intranet_today_clockin', true);
    if (empty($today_clock)) {
        $today = date('Y-m-d');
        $today_clock = get_user_meta($user_id, 'rd_intranet_clockin_' . $today, true);
    }

    if (!empty($today_clock)) {
        $imm = json_decode($today_clock, true);
        if (is_array($imm)) {
            $draft['clockIn'] = $imm['clockIn'];
            if (!empty($imm['ubicacionEntrada']) && $imm['ubicacionEntrada'] !== 'Obteniendo ubicación...' && $imm['ubicacionEntrada'] !== 'N/A') {
                $draft['ubicacionEntrada'] = $imm['ubicacionEntrada'];
            }
        } else {
            $draft['clockIn'] = $today_clock;
        }
    }

    return rest_ensure_response(empty($draft) ? null : $draft);
}

function rd_intranet_save_draft($request) {
    $user_id = get_current_user_id();
    $params = $request->get_json_params();
    if (!is_array($params)) $params = array();

    // Blindaje: Si ya existe una hora inmutable para el día en el servidor, jamás permitir que un borrador desde móvil con clockIn nulo la borre
    $today_clock = get_user_meta($user_id, 'rd_intranet_today_clockin', true);
    if (empty($today_clock)) {
        $today = date('Y-m-d');
        $today_clock = get_user_meta($user_id, 'rd_intranet_clockin_' . $today, true);
    }

    if (!empty($today_clock)) {
        $imm = json_decode($today_clock, true);
        $params['clockIn'] = is_array($imm) ? $imm['clockIn'] : $today_clock;
        if (is_array($imm) && !empty($imm['ubicacionEntrada']) && $imm['ubicacionEntrada'] !== 'Obteniendo ubicación...' && $imm['ubicacionEntrada'] !== 'N/A') {
            $params['ubicacionEntrada'] = $imm['ubicacionEntrada'];
        }
    }

    update_user_meta($user_id, 'rd_intranet_draft', wp_json_encode($params));
    return rest_ensure_response(array('success' => true));
}

function rd_intranet_handle_clock_in($request) {
    $user_id = get_current_user_id();
    $params = $request->get_json_params();
    $clock_in = $params['clockIn'] ?? '';
    $ubicacion = $params['ubicacionEntrada'] ?? '';
    $fecha = $params['fecha'] ?? date('Y-m-d');

    if (empty($clock_in)) {
        return rest_ensure_response(array('success' => false, 'message' => 'Hora de entrada inválida'));
    }

    $meta_key = 'rd_intranet_clockin_' . $fecha;
    $existing = get_user_meta($user_id, $meta_key, true);
    if (empty($existing)) {
        $existing = get_user_meta($user_id, 'rd_intranet_today_clockin', true);
    }

    if (!empty($existing)) {
        $existing_data = json_decode($existing, true);
        if (!is_array($existing_data)) {
            $existing_data = array('clockIn' => $existing, 'ubicacionEntrada' => $ubicacion);
        }
        // Si ya existe la hora inmutable de hoy, rechazar categóricamente cualquier intento de cambiar la hora (anti-trampas)
        if (!empty($ubicacion) && ($existing_data['ubicacionEntrada'] === 'Obteniendo ubicación...' || $existing_data['ubicacionEntrada'] === 'N/A')) {
            $existing_data['ubicacionEntrada'] = $ubicacion;
            update_user_meta($user_id, $meta_key, wp_json_encode($existing_data));
            update_user_meta($user_id, 'rd_intranet_today_clockin', wp_json_encode($existing_data));
        }
        return rest_ensure_response(array(
            'success' => true,
            'already_registered' => true,
            'clockIn' => $existing_data['clockIn'],
            'ubicacionEntrada' => $existing_data['ubicacionEntrada']
        ));
    }

    $data = array(
        'clockIn' => $clock_in,
        'ubicacionEntrada' => $ubicacion
    );
    update_user_meta($user_id, $meta_key, wp_json_encode($data));
    update_user_meta($user_id, 'rd_intranet_today_clockin', wp_json_encode($data));

    // Asegurar que también esté en el borrador al instante
    $draft_str = get_user_meta($user_id, 'rd_intranet_draft', true);
    $draft = $draft_str ? json_decode($draft_str, true) : array();
    if (!is_array($draft)) $draft = array();
    $draft['clockIn'] = $clock_in;
    $draft['ubicacionEntrada'] = $ubicacion;
    update_user_meta($user_id, 'rd_intranet_draft', wp_json_encode($draft));

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
    $params = $request->get_json_params();
    
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
    $hora_salida = current_time('mysql');

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

    $post_id = wp_insert_post($post_data);
    
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
    update_post_meta($post_id, 'ingresos_json', wp_json_encode($ingresos));
    update_post_meta($post_id, 'actuaciones_json', wp_json_encode($actuaciones));
    update_post_meta($post_id, 'programaciones_json', wp_json_encode($programaciones));
    
    if ($cierre_retrasado) {
        update_post_meta($post_id, 'cierre_retrasado', '1');
    }

    // Eliminar borrador y sellos inmutables al finalizar jornada
    delete_user_meta($user_id, 'rd_intranet_draft');
    delete_user_meta($user_id, 'rd_intranet_today_clockin');
    delete_user_meta($user_id, 'rd_intranet_clockin_' . $fecha_reporte);
    delete_user_meta($user_id, 'rd_intranet_clockin_' . date('Y-m-d'));

    return rest_ensure_response(array('success' => true, 'message' => 'Día cerrado exitosamente.', 'post_id' => $post_id));
}

function rd_intranet_get_bitacoras() {
    $args = array(
        'post_type' => 'rd_bitacora',
        'posts_per_page' => 50, // Últimas 50
        'post_status' => 'publish'
    );
    
    $query = new WP_Query($args);
    $resultados = array();
    
    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $resultados[] = array(
                'id' => get_the_ID(),
                'user' => get_the_author(),
                'date' => get_the_date('Y-m-d'),
                'clockIn' => get_post_meta(get_the_ID(), 'hora_entrada', true),
                'clockOut' => get_post_meta(get_the_ID(), 'hora_salida', true),
                'status' => get_post_meta(get_the_ID(), 'estado_revision', true) ?: 'Enviado',
                'ubicacionEntrada' => get_post_meta(get_the_ID(), 'ubicacion_entrada', true),
                'ubicacionSalida' => get_post_meta(get_the_ID(), 'ubicacion_salida', true),
                'content' => get_the_content(),
                'pdfBase64' => get_post_meta(get_the_ID(), 'bitacora_pdf_base64', true),
                'cierreRetrasado' => get_post_meta(get_the_ID(), 'cierre_retrasado', true) === '1',
                'actuaciones' => json_decode(get_post_meta(get_the_ID(), 'actuaciones_json', true), true) ?: array(),
                'ingresos' => json_decode(get_post_meta(get_the_ID(), 'ingresos_json', true), true) ?: array(),
                'programaciones' => json_decode(get_post_meta(get_the_ID(), 'programaciones_json', true), true) ?: array()
            );
        }
        wp_reset_postdata();
    }
    
    return rest_ensure_response($resultados);
}

function rd_intranet_handle_admin_update($request) {
    $params = $request->get_json_params();
    $post_id = intval($params['post_id'] ?? 0);
    $nuevo_comentario = sanitize_textarea_field($params['comentario_admin'] ?? '');
    $programaciones_editadas = $params['programaciones'] ?? null;
    
    if ($post_id > 0) {
        if ($nuevo_comentario) {
            update_post_meta($post_id, 'comentario_admin', $nuevo_comentario);
        }
        if (is_array($programaciones_editadas)) {
            update_post_meta($post_id, 'programaciones_json', wp_json_encode($programaciones_editadas));
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
        
        return rest_ensure_response(array(
            'success' => true,
            'programaciones' => $todas_las_programaciones,
            'comentario_admin' => $comentario_admin,
            'fecha_bitacora' => $fecha_bitacora
        ));
    }
    return rest_ensure_response(array('success' => true, 'programaciones' => array(), 'comentario_admin' => '', 'fecha_bitacora' => ''));
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
    
    return rest_ensure_response(array('success' => true, 'message' => 'Base de datos de pruebas reseteada correctamente.'));
}

function rd_intranet_get_my_history() {
    $user_id = get_current_user_id();
    $args = array(
        'post_type' => 'rd_bitacora',
        'author' => $user_id,
        'posts_per_page' => 50,
        'post_status' => 'publish',
        'orderby' => 'date',
        'order' => 'DESC'
    );
    
    $query = new WP_Query($args);
    $resultados = array();
    
    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $resultados[] = array(
                'id' => get_the_ID(),
                'date' => get_the_date('Y-m-d'),
                'clockIn' => get_post_meta(get_the_ID(), 'hora_entrada', true),
                'clockOut' => get_post_meta(get_the_ID(), 'hora_salida', true),
                'status' => get_post_meta(get_the_ID(), 'estado_revision', true) ?: 'Enviado',
                'ubicacionEntrada' => get_post_meta(get_the_ID(), 'ubicacion_entrada', true),
                'ubicacionSalida' => get_post_meta(get_the_ID(), 'ubicacion_salida', true),
                'pdfBase64' => get_post_meta(get_the_ID(), 'bitacora_pdf_base64', true)
            );
        }
        wp_reset_postdata();
    }
    
    return rest_ensure_response($resultados);
}
