import os

file_path = "backend/app.py"
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep 1..4282 (index 0..4281)
# Keep 4374..End (index 4373..End)
new_lines = lines[:4282] + lines[4373:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Successfully cleaned app.py. New length: {len(new_lines)}")
