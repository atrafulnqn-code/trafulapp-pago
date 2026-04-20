import os

file_path = 'backend/app.py'

if not os.path.exists(file_path):
    # Try another relative path just in case
    file_path = './backend/app.py'

if not os.path.exists(file_path):
    print(f"Error: {file_path} not found")
    exit(1)

lines_to_keep = []
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line numbers from view_file (Current state):
# Start Deletion: 4283 (idx 4282)
# End Deletion: 4379 (idx 4378)
# Line 4380 should be the @app.route for get_history_by_payment_id

start_del_idx = 4282
end_del_idx = 4378

print(f"File: {file_path}")
print(f"Total lines before: {len(lines)}")
print(f"Deleting 0-indexed indices {start_del_idx} to {end_del_idx}")

for i, line in enumerate(lines):
    if not (start_del_idx <= i <= end_del_idx):
        lines_to_keep.append(line)

print(f"Total lines after: {len(lines_to_keep)}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines_to_keep)

print("Cleanup successful.")
