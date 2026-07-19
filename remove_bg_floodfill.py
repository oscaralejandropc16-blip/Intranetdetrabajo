from PIL import Image

def remove_background(input_path, output_path, tolerance=50):
    try:
        img = Image.open(input_path).convert("RGBA")
        width, height = img.size
        
        # We will do a simple BFS flood fill from the corners
        # to find all background pixels
        
        # Target color is white-ish
        def is_bg(pixel):
            r, g, b, a = pixel
            return r > 255 - tolerance and g > 255 - tolerance and b > 255 - tolerance
            
        visited = set()
        queue = [(0, 0), (width-1, 0), (0, height-1), (width-1, height-1)]
        
        pixels = img.load()
        
        for q in queue:
            if is_bg(pixels[q[0], q[1]]):
                visited.add(q)
                
        q_idx = 0
        while q_idx < len(queue):
            x, y = queue[q_idx]
            q_idx += 1
            
            # check neighbors
            for dx, dy in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height:
                    if (nx, ny) not in visited:
                        if is_bg(pixels[nx, ny]):
                            visited.add((nx, ny))
                            queue.append((nx, ny))
                            
        # Now set all visited pixels to transparent
        for (x, y) in visited:
            pixels[x, y] = (255, 255, 255, 0)
            
        img.save(output_path, "PNG")
        print("Background removed successfully.")
    except Exception as e:
        print("Error:", e)

remove_background("webapp/public/dog_logo.png", "webapp/public/dog_logo.png")
