import os

def load_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception:
        return "[]"

error_logs = load_json('postgres_error_logs_19ene_10feb.json')
cash_payments = load_json('postgres_cash_payments_19ene_10feb.json')
payments = load_json('postgres_payments_19ene_10feb.json')

html_template = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PostgreSQL Dashboard - Traful</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        :root {{
            --bg-color: #0f172a;
            --glass-bg: rgba(30, 41, 59, 0.7);
            --glass-border: rgba(255, 255, 255, 0.1);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #3b82f6;
            --accent-hover: #60a5fa;
            --error: #ef4444;
            --success: #10b981;
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Outfit', sans-serif;
        }}

        body {{
            background-color: var(--bg-color);
            background-image: 
                radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.15) 0px, transparent 50%);
            background-attachment: fixed;
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 2rem;
        }}

        header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            padding: 1.5rem;
            background: var(--glass-bg);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 1rem;
            border: 1px solid var(--glass-border);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        }}

        h1 {{
            font-size: 1.8rem;
            font-weight: 800;
            background: linear-gradient(to right, #60a5fa, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }}

        .stats-container {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }}

        .stat-card {{
            background: var(--glass-bg);
            backdrop-filter: blur(12px);
            border: 1px solid var(--glass-border);
            border-radius: 1rem;
            padding: 1.5rem;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}

        .stat-card:hover, .stat-card.active {{
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
            border-color: var(--accent);
        }}

        .stat-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: var(--text-muted);
            font-size: 0.9rem;
            margin-bottom: 0.5rem;
        }}

        .stat-value {{
            font-size: 2.5rem;
            font-weight: 800;
            color: var(--text-main);
        }}

        main {{
            flex: 1;
            background: var(--glass-bg);
            backdrop-filter: blur(12px);
            border: 1px solid var(--glass-border);
            border-radius: 1rem;
            padding: 1.5rem;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }}

        .table-controls {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 1rem;
            align-items: center;
        }}

        h2 {{
            font-size: 1.4rem;
            font-weight: 600;
        }}
        
        .table-responsive {{
            overflow-x: auto;
            border-radius: 0.5rem;
            border: 1px solid var(--glass-border);
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }}

        thead {{
            background: rgba(255, 255, 255, 0.05);
        }}

        th, td {{
            padding: 1rem;
            border-bottom: 1px solid var(--glass-border);
        }}

        th {{
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
        }}

        tr:last-child td {{
            border-bottom: none;
        }}

        tbody tr {{
            transition: background 0.2s ease;
        }}

        tbody tr:hover {{
            background: rgba(255, 255, 255, 0.05);
        }}

        .badge {{
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
            background: rgba(239, 68, 68, 0.2);
            color: var(--error);
        }}

        .code-block {{
            background: rgba(0, 0, 0, 0.3);
            padding: 0.5rem;
            border-radius: 0.5rem;
            font-family: monospace;
            font-size: 0.8rem;
            white-space: pre-wrap;
            color: #a78bfa;
            max-height: 150px;
            overflow-y: auto;
        }}

        /* Scrollbar styles */
        ::-webkit-scrollbar {{
            width: 8px;
            height: 8px;
        }}
        
        ::-webkit-scrollbar-track {{
            background: rgba(0, 0, 0, 0.1);
            border-radius: 4px;
        }}
        
        ::-webkit-scrollbar-thumb {{
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
        }}
        
        ::-webkit-scrollbar-thumb:hover {{
            background: rgba(255, 255, 255, 0.3);
        }}
    </style>
</head>
<body>

    <header>
        <h1><i data-lucide="database"></i> Postgres Sentinel</h1>
        <div style="font-size: 0.9rem; color: var(--text-muted);">
            Fechas: 19 Ene 2026 - 10 Feb 2026
        </div>
    </header>

    <div class="stats-container">
        <div class="stat-card active" onclick="loadTable('error_logs', this)">
            <div class="stat-header">
                <span>Error Logs</span>
                <i data-lucide="alert-triangle" style="color: var(--error)"></i>
            </div>
            <div class="stat-value" id="count-error">0</div>
        </div>
        <div class="stat-card" onclick="loadTable('cash_payments', this)">
            <div class="stat-header">
                <span>Cash Payments</span>
                <i data-lucide="banknote" style="color: var(--success)"></i>
            </div>
            <div class="stat-value" id="count-cash">0</div>
        </div>
        <div class="stat-card" onclick="loadTable('payments', this)">
            <div class="stat-header">
                <span>Payments</span>
                <i data-lucide="credit-card" style="color: var(--accent)"></i>
            </div>
            <div class="stat-value" id="count-payments">0</div>
        </div>
    </div>

    <main>
        <div class="table-controls">
            <h2 id="table-title">Error Logs</h2>
        </div>
        <div class="table-responsive">
            <table id="data-table">
                <thead id="table-head">
                    <!-- headers generated dynamically -->
                </thead>
                <tbody id="table-body">
                    <!-- rows generated dynamically -->
                </tbody>
            </table>
        </div>
    </main>

    <script>
        // Injected Data
        const errorLogs = {error_logs};
        const cashPayments = {cash_payments};
        const payments = {payments};

        const formatValue = (key, val) => {{
            if (val === null) return '-';
            if (typeof val === 'object') return `<div class="code-block">${{JSON.stringify(val, null, 2)}}</div>`;
            if (key.includes('error') || key.includes('stack')) return `<div class="code-block">${{val}}</div>`;
            return val;
        }};

        function loadTable(type, element) {{
            // Update active styling
            document.querySelectorAll('.stat-card').forEach(el => el.classList.remove('active'));
            if(element) element.classList.add('active');

            let data = [];
            let title = '';

            if (type === 'error_logs') {{
                data = errorLogs;
                title = 'Registros de Errores';
            }} else if (type === 'cash_payments') {{
                data = cashPayments;
                title = 'Pagos en Efectivo';
            }} else if (type === 'payments') {{
                data = payments;
                title = 'Registro de Pagos (Digital/General)';
            }}

            document.getElementById('table-title').innerText = title;
            
            const thead = document.getElementById('table-head');
            const tbody = document.getElementById('table-body');
            
            thead.innerHTML = '';
            tbody.innerHTML = '';

            if (data.length === 0) {{
                tbody.innerHTML = '<tr><td colspan="100%" style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay registros para este rango de fechas.</td></tr>';
                return;
            }}

            // Get all possible keys
            const keys = new Set();
            data.forEach(item => Object.keys(item).forEach(k => keys.add(k)));
            const columns = Array.from(keys);

            // Create Headers
            const trHead = document.createElement('tr');
            columns.forEach(col => {{
                const th = document.createElement('th');
                th.innerText = col.replace(/_/g, ' ');
                trHead.appendChild(th);
            }});
            thead.appendChild(trHead);

            // Create Rows
            data.forEach(item => {{
                const tr = document.createElement('tr');
                columns.forEach(col => {{
                    const td = document.createElement('td');
                    td.innerHTML = formatValue(col, item[col]);
                    tr.appendChild(td);
                }});
                tbody.appendChild(tr);
            }});
        }}

        // Initialize icons and counts
        document.addEventListener("DOMContentLoaded", () => {{
            lucide.createIcons();
            document.getElementById('count-error').innerText = errorLogs.length;
            document.getElementById('count-cash').innerText = cashPayments.length;
            document.getElementById('count-payments').innerText = payments.length;

            // Load default table
            loadTable('error_logs');
        }});

    </script>
</body>
</html>
"""

with open("visor_postgres.html", "w", encoding="utf-8") as f:
    f.write(html_template)

print("HTML generated at visor_postgres.html")
