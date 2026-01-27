import pandas as pd
import re
import numpy as np
import io

# --- Funciones de limpieza ---

def clean_dni(dni):
    """
    Limpia y estandariza los valores de la columna DNI.
    - Identifica números completos separados por espacios o '/'.
    - Elimina puntos y caracteres no numéricos de cada número.
    - Une los DNIs limpios con ' - '.
    """
    if pd.isna(dni):
        return None
    
    # Reemplazar barras y otros posibles separadores por espacios
    separators = r'[/,;]'
    normalized_str = re.sub(separators, ' ', str(dni))
    
    # Dividir el string en partes basadas en espacios
    parts = normalized_str.split(' ')
    
    # Limpiar cada parte, quedándose solo con los números
    cleaned_numbers = []
    for part in parts:
        # Eliminar todos los caracteres que no son dígitos
        num_only = re.sub(r'\D', '', part)
        if num_only:
            cleaned_numbers.append(num_only)
            
    if not cleaned_numbers:
        return None
        
    # Unir los números limpios con ' - '
    return ' - '.join(cleaned_numbers)

def clean_currency(value):
    """
    Limpia y convierte valores de moneda a formato numérico.
    - Elimina '$' y espacios.
    - Reemplaza ',' por '.' para decimales.
    - Maneja valores no válidos.
    """
    if pd.isna(value) or str(value).strip() == '-':
        return np.nan
    # Limpiar el string
    cleaned_value = str(value).replace('$', '').replace('.', '').replace(',', '.').strip()
    if not cleaned_value:
        return np.nan
    try:
        return float(cleaned_value)
    except (ValueError, TypeError):
        return np.nan

# --- Script principal ---

# Cargar el archivo CSV
file_path = 'retributivos 2026 - último - Hoja2.csv'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        # Leer el contenido y normalizar los saltos de línea
        content = f.read().replace('\r\n', '\n')
        
    # Leer las dos primeras líneas para el encabezado desde el contenido en memoria
    header_lines = content.split('\n', 2)
    header_line1 = header_lines[0].strip().split(',')
    header_line2 = header_lines[1].strip().split(',')
    
    # El resto del contenido para el DataFrame
    csv_content_for_df = header_lines[2]

except FileNotFoundError:
    print(f"Error: No se encontró el archivo en la ruta: {file_path}")
    exit()

# Fusionar las dos líneas del encabezado
header = []
for h1, h2 in zip(header_line1, header_line2):
    h1, h2 = h1.strip(), h2.strip()
    if h1 and h1 not in ['2026', '']:
        header.append(h1)
    elif h2:
        header.append(h2)
    else:
        header.append(f'Unnamed_{len(header)}')

# Usar un buffer en memoria (StringIO) para leer el contenido del CSV
csv_io = io.StringIO(csv_content_for_df)

# Leer el CSV en un DataFrame
df = pd.read_csv(csv_io, header=None, engine='python', sep=',', quotechar='"', skipinitialspace=True)

# Asignar nombres de columna y manejar columnas extra
if df.shape[1] > len(header):
    # Si hay más columnas en los datos, descartar las que no tienen nombre en el header
    df = df.iloc[:, :len(header)]
df.columns = header

# 1. Limpiar todas las columnas de tipo string para eliminar espacios extra
for col in df.select_dtypes(include=['object']):
    df[col] = df[col].str.strip()

# 2. Limpiar columna DNI con la nueva lógica
df['DNI'] = df['DNI'].apply(clean_dni)

# 3. Limpiar columnas de moneda
currency_columns = ['RETRIBUTIVO', 'AGUA domiciliaria', 'AGUA comercial']
for col in currency_columns:
    if col in df.columns:
        df[col] = df[col].apply(clean_currency)

# 4. Reemplazar "sin mensura"
df['NOMENCLATURA CATASTRAL'] = df['NOMENCLATURA CATASTRAL'].replace('sin mensura', np.nan, regex=False)

# 5. Guardar el archivo limpio
output_path = 'retributivos_2026_limpio.csv'
df.to_csv(output_path, index=False, encoding='utf-8')

print(f"Archivo limpiado y guardado en: {output_path}")
print("\nPrimeras 5 filas del archivo limpio:")
print(df.head())
print("\nEjemplo de DNI corregido:")
print(df[df['CONTRIBUYENTE'] == 'Avila Luis con Gallegos Ingrid']['DNI'].iloc[0])