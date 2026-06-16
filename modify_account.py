import sys

file_path = "sections/main-account.liquid"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

start_orders_idx = -1
end_orders_idx = -1
content_start_idx = -1
content_end_idx = -1

for i, line in enumerate(lines):
    if "{% comment %}--- DASHBOARD CONTENT ---{% endcomment %}" in line:
        content_start_idx = i + 1 # The <div class="db-content">
    if "========== ROW 4: RECENT ORDERS + POINTS HISTORY ==========" in line:
        start_orders_idx = i
    if "========== ROW 5: PRODUCTS ==========" in line:
        end_orders_idx = i - 1 # The empty line before row 5
    if "{% comment %}--- JAVASCRIPT ---{% endcomment %}" in line:
        content_end_idx = i - 4 # The closing </div> for db-content is at i-4

if start_orders_idx != -1 and end_orders_idx != -1 and content_start_idx != -1 and content_end_idx != -1:
    orders_block = lines[start_orders_idx:end_orders_idx+1]
    
    new_lines = lines[:content_start_idx+1]
    new_lines.append('      <div id="db-dashboard-content" style="animation: fadeIn 0.3s ease;">\n')
    
    # Append everything between content_start and end_content EXCEPT orders block
    for i in range(content_start_idx+1, content_end_idx):
        if i < start_orders_idx or i > end_orders_idx:
            new_lines.append(lines[i])
            
    new_lines.append('      </div>\n')
    new_lines.append('      <div id="db-orders-tab" style="display: none; animation: fadeIn 0.3s ease;">\n')
    new_lines.extend(orders_block)
    new_lines.append('      </div>\n')
    
    new_lines.extend(lines[content_end_idx:])
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
    print("Done rewriting main-account.liquid")
else:
    print(f"Failed to find indices: start_orders={start_orders_idx}, end_orders={end_orders_idx}, content_start={content_start_idx}, content_end={content_end_idx}")
