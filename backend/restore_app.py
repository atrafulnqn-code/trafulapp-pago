import os

source = r"c:\Users\emanuel\Desktop\Codigos\Traful_tablero\backend\original_app.py"
target = r"c:\Users\emanuel\Desktop\Codigos\Traful_tablero\backend\app.py"

try:
    with open(source, 'r', encoding='utf-16') as f:
        content = f.read()
    with open(target, 'w', encoding='utf-8') as f:
        f.write(content)
    print("RESTORATION_SUCCESS")
except Exception as e:
    print(f"RESTORATION_ERROR: {e}")
