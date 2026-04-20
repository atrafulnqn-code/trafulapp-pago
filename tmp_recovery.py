import os

source = r'c:\Users\emanuel\Desktop\Codigos\Traful_tablero\backend\original_app.py'
target = r'c:\Users\emanuel\Desktop\Codigos\Traful_tablero\backend\recovered_app.py'

try:
    with open(source, 'r', encoding='utf-16') as f:
        content = f.read()
    with open(target, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"SUCCESS: Recovered {len(content)} characters.")
except Exception as e:
    print(f"ERROR: {e}")
