import os
import re
import datetime
import pandas as pd
import xlsxwriter
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

# Cores Corporativas Vale S.A.
G = '#00807C'  # Verde Vale
Y = '#EEA722'  # Amarelo Vale
W = '#FFFFFF'  # Branco
LIGHT_G = '#E5F2F2' # Verde muito claro para alternância
GREY = '#666666'
LIGHT_GREY = '#E0E0E0'

# 1. Configurações de arquivos
script_dir = os.path.dirname(os.path.abspath(__file__))
base_file = os.path.join(script_dir, 'data (10) (1)(Base de dados 2026).csv')
export_file = os.path.join(script_dir, 'data (10) (1)(Export).csv')

has_files = os.path.exists(base_file) and os.path.exists(export_file)

if not has_files:
    print("Aviso: Arquivos de dados de entrada não encontrados no diretório!")
    base_df = None
    export_df = None
    code_col = status_col = name_col = owner_col = gerencia_col = insp_col = date_col = None
    recent_period = None
    data_acumulado_ativos = []
    uninspected_acumulado_ativos = []
    data_mensal_ativos = []
    uninspected_mensal_ativos = []
    main_adherence_data = []
    main_uninspected = []
    main_label = ""
    extra_adherence_data = None
    extra_uninspected = None
    extra_label = ""
    tot_postos = 0
    tot_insp = 0
    adh_geral = 0
    if __name__ == '__main__':
        exit(1)

# 2. Funções de Normalização e Cruzamento (idênticas ao app Next.js)
def normalize_digits(digits):
    d = re.sub(r'\D', '', digits)
    if not d:
        return ''
    if 0 < len(d) < 6:
        return d.zfill(6)
    return d

def to_post_code(suffix):
    s = re.sub(r'\s+', '', suffix).upper()
    if not s or len(s) < 2:
        return None
    if not re.match(r'^[A-Z0-9]+$', s):
        return None
    if not re.search(r'\d', s):
        return None
    if re.match(r'^\d+$', s):
        return f"POST-{normalize_digits(s)}"
    return f"POST-{s}"

def extract_code(value):
    if not isinstance(value, str) or not value.strip():
        return None
    trimmed = value.strip()
    
    # 1. Correspondência direta
    cleaned = re.sub(r'\s+', '', trimmed).replace('–', '-').replace('—', '-').replace('_', '-').upper()
    match_prefix = re.match(r'^(?:POST-?|POSTO-?|WORKSTATION-?|WKS-?|WS-?)([A-Z0-9]{2,})$', cleaned)
    if match_prefix:
        return to_post_code(match_prefix.group(1))
        
    if re.match(r'^\d{4,}$', cleaned):
        return f"POST-{normalize_digits(cleaned)}"
        
    # 2. Busca padrão POST no texto
    pattern = re.compile(r'(?:POSTO|POST|WORKSTATION|WKS|WS)[\s\-_–—]*([A-Za-z0-9]{2,})', re.IGNORECASE)
    match_any = pattern.search(trimmed)
    if match_any:
        return to_post_code(match_any.group(1))
        
    return None

def parse_to_comparable_date(raw):
    if not isinstance(raw, str) or not raw.strip():
        return ''
    raw = raw.strip()
    if re.match(r'^\d{4}-\d{2}-\d{2}', raw):
        return raw[:10]
    dmy = re.match(r'^(\d{2})[/-](\d{2})[/-](\d{4})', raw)
    if dmy:
        return f"{dmy.group(3)}-{dmy.group(2)}-{dmy.group(1)}"
        
    months = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
        'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    }
    d_mon_y = re.match(r'^(\d{2})-([A-Za-z]{3})-(\d{4})', raw)
    if d_mon_y:
        m = months.get(d_mon_y.group(2).lower())
        if m:
            return f"{d_mon_y.group(3)}-{m}-{d_mon_y.group(1)}"
    return raw

def format_date_br(iso):
    if not iso or iso == '—':
        return '—'
    parts = iso.split('-')
    if len(parts) != 3:
        return iso
    return f"{parts[2]}/{parts[1]}/{parts[0]}"

else:
    # 3. Leitura dos dados usando Pandas (Latin1 encoding para acentos)
    print("Carregando bases...")
    base_df = pd.read_csv(base_file, encoding='latin1', sep=None, engine='python')
    export_df = pd.read_csv(export_file, encoding='latin1', sep=None, engine='python')

    # Detectar colunas automaticamente
    code_col = next((c for c in base_df.columns if re.search(r'CodigoPosto|WorkstationCode', c, re.I)), base_df.columns[0])
    status_col = next((c for c in base_df.columns if re.search(r'StatusPosto|WorkstationStatus|status', c, re.I)), None)
    name_col = next((c for c in base_df.columns if re.search(r'NomePosto|WorkstationName|nome.*posto', c, re.I)), None)
    owner_col = next((c for c in base_df.columns if re.search(r'DonoPosto/WorkstationOwner|DonoPosto', c, re.I)), None)
    gerencia_col = next((c for c in base_df.columns if re.search(r'VP-4', c, re.I)), None)
    if not gerencia_col:
        gerencia_col = next((c for c in base_df.columns if re.search(r'VP-3', c, re.I)), None)
    if not gerencia_col:
        gerencia_col = next((c for c in base_df.columns if re.search(r'gerencia|gerência', c, re.I)), base_df.columns[0])

    insp_col = next((c for c in export_df.columns if re.search(r'T.tulo do Incidente|titulo|título', c, re.I)), export_df.columns[0])
    date_col = next((c for c in export_df.columns if re.search(r'Data Incidente|data', c, re.I)), None)

    print(f"Colunas Utilizadas:\n - Base Código: {code_col}\n - Base Status: {status_col}\n - Base Gerência: {gerencia_col}\n - Export Ref: {insp_col}\n - Export Data: {date_col}")

# 4. Processamento de Aderência
def get_adherence_data(active_only=True, period=None):
    # Mapa de códigos inspecionados
    inspected_map = {}
    for _, row in export_df.iterrows():
        raw_val = str(row[insp_col]) if pd.notna(row[insp_col]) else ''
        code = extract_code(raw_val)
        if not code:
            continue
            
        row_date = parse_to_comparable_date(str(row[date_col])) if date_col and pd.notna(row[date_col]) else ''
        
        # Filtro de período
        if period and row_date:
            if row_date < period['from'] or row_date > period['to']:
                continue
                
        existing_date = inspected_map.get(code)
        if not existing_date or row_date > existing_date:
            inspected_map[code] = row_date

    # Filtrar Base
    filtered_base = []
    for _, row in base_df.iterrows():
        # Filtro status
        if status_col and pd.notna(row[status_col]):
            st = str(row[status_col]).lower().strip()
            is_active = st in ['ativo', 'active', 'a', 'sim', 'yes', '1', 'true'] or (st.startswith('ativ') and not st.startswith('inativ'))
            if active_only != is_active:
                continue
        filtered_base.append(row)

    # Agrupamento hierárquico
    tree = {}
    uninspected_list = []
    code_to_name = {}
    
    for row in filtered_base:
        raw_val = str(row[code_col]) if code_col in base_df.columns and pd.notna(row[code_col]) else ''
        code = extract_code(raw_val)
        if not code:
            continue
            
        group = str(row[gerencia_col]) if gerencia_col and pd.notna(row[gerencia_col]) else 'N/A'
        sub = str(row[owner_col]) if owner_col and pd.notna(row[owner_col]) else 'N/A'
        name = str(row[name_col]) if name_col and pd.notna(row[name_col]) else '—'
        
        code_to_name[code] = name
        
        if group not in tree:
            tree[group] = {}
        if sub not in tree[group]:
            tree[group][sub] = set()
            
        tree[group][sub].add(code)
        
        if code not in inspected_map:
            uninspected_list.append({
                'codigo': code,
                'nome': name,
                'coordenador': sub,
                'gerencia': group
            })

    # Calcular aderências
    results = []
    for group_name, sub_map in tree.items():
        children = []
        for sub_name, codes in sub_map.items():
            total = len(codes)
            inspected_list = [c for c in codes if c in inspected_map]
            inspected = len(inspected_list)
            adherence = round((inspected / total) * 100) if total > 0 else 0
            
            dates = [inspected_map[c] for c in inspected_list if inspected_map[c]]
            last_date = sorted(dates)[-1] if dates else '—'
            
            missing_posts = []
            for c in codes:
                if c not in inspected_map:
                    missing_posts.append({
                        'code': c,
                        'name': code_to_name.get(c, '—')
                    })
            
            children.append({
                'name': sub_name,
                'total': total,
                'inspected': inspected,
                'adherence': adherence,
                'last_date': last_date,
                'missing_posts': missing_posts
            })
            
        children.sort(key=lambda x: x['total'], reverse=True)
        
        total = sum(c['total'] for c in children)
        inspected = sum(c['inspected'] for c in children)
        adherence = round((inspected / total) * 100) if total > 0 else 0
        
        dates = [c['last_date'] for c in children if c['last_date'] != '—']
        last_date = sorted(dates)[-1] if dates else '—'
        
        results.append({
            'name': group_name,
            'total': total,
            'inspected': inspected,
            'adherence': adherence,
            'last_date': last_date,
            'children': children
        })
        
    results.sort(key=lambda x: x['total'], reverse=True)
    return results, uninspected_list

# Determinar mês mais recente
max_date = ''
if date_col:
    for _, row in export_df.iterrows():
        d = parse_to_comparable_date(str(row[date_col])) if pd.notna(row[date_col]) else ''
        if re.match(r'^\d{4}-\d{2}-\d{2}$', d) and d > max_date:
            max_date = d

recent_period = None
if max_date:
    year, month = max_date.split('-')[:2]
    import calendar
    _, last_day = calendar.monthrange(int(year), int(month))
    recent_period = {
        'from': f"{year}-{month}-01",
        'to': f"{year}-{month}-{last_day:02d}",
        'label': f"{month}/{year}"
    }

print(f"Mês recente: {recent_period['label'] if recent_period else 'Não detectado'}")

# Computar dados
data_acumulado_ativos, uninspected_acumulado_ativos = get_adherence_data(active_only=True, period=None)
data_mensal_ativos, uninspected_mensal_ativos = get_adherence_data(active_only=True, period=recent_period) if recent_period else ([], [])

# Selecionar dados principais para o relatório (mensal se existir, senão acumulado)
if recent_period and data_mensal_ativos:
    main_adherence_data = data_mensal_ativos
    main_uninspected = uninspected_mensal_ativos
    main_label = f"Mês de {recent_period['label']}"
    
    extra_adherence_data = data_acumulado_ativos
    extra_uninspected = uninspected_acumulado_ativos
    extra_label = "Acumulado"
else:
    main_adherence_data = data_acumulado_ativos
    main_uninspected = uninspected_acumulado_ativos
    main_label = "Acumulado Geral"
    
    extra_adherence_data = None
    extra_uninspected = None
    extra_label = ""


# 5. GERAÇÃO DO XLSX COM FORMATAÇÃO PREMIUM
xlsx_name = 'Relatorio_Aderencia_Vale.xlsx'
print(f"Gerando XLSX formatado: {xlsx_name}...")
workbook = xlsxwriter.Workbook(xlsx_name)

# Formatos
f_title = workbook.add_format({'bold': True, 'font_name': 'Segoe UI', 'font_size': 14, 'font_color': '#FFFFFF', 'bg_color': G, 'align': 'center', 'valign': 'vcenter'})
f_subtitle = workbook.add_format({'font_name': 'Segoe UI', 'font_size': 10, 'italic': True, 'font_color': G, 'align': 'center'})
f_header = workbook.add_format({'bold': True, 'font_name': 'Segoe UI', 'font_size': 10, 'font_color': '#FFFFFF', 'bg_color': G, 'border': 1, 'border_color': G, 'align': 'center', 'valign': 'vcenter'})
f_kpi_label = workbook.add_format({'bold': True, 'font_name': 'Segoe UI', 'font_size': 9, 'font_color': G, 'bg_color': LIGHT_G, 'border': 1, 'border_color': G, 'align': 'center'})
f_kpi_val = workbook.add_format({'bold': True, 'font_name': 'Segoe UI', 'font_size': 18, 'font_color': G, 'bg_color': LIGHT_G, 'border': 1, 'border_color': G, 'align': 'center'})
f_kpi_val_pct = workbook.add_format({'bold': True, 'font_name': 'Segoe UI', 'font_size': 18, 'font_color': Y, 'bg_color': LIGHT_G, 'border': 1, 'border_color': G, 'align': 'center'})

f_group = workbook.add_format({'bold': True, 'font_name': 'Segoe UI', 'font_size': 10, 'font_color': G, 'border': 1, 'border_color': LIGHT_GREY, 'bg_color': LIGHT_G})
f_child = workbook.add_format({'font_name': 'Segoe UI', 'font_size': 10, 'border': 1, 'border_color': LIGHT_GREY})
f_total = workbook.add_format({'bold': True, 'font_name': 'Segoe UI', 'font_size': 10, 'font_color': '#FFFFFF', 'bg_color': G, 'border': 1, 'border_color': G})
f_pct = workbook.add_format({'align': 'right', 'num_format': '0"%"'})
f_pct_bold = workbook.add_format({'bold': True, 'align': 'right', 'num_format': '0"%"'})

# Status badges
f_status_done = workbook.add_format({'bold': True, 'font_name': 'Segoe UI', 'font_size': 9, 'font_color': G, 'align': 'center'})
f_status_pending = workbook.add_format({'bold': True, 'font_name': 'Segoe UI', 'font_size': 9, 'font_color': Y, 'align': 'center'})
f_post_pending = workbook.add_format({'font_name': 'Segoe UI', 'font_size': 9, 'font_color': '#7F5A00', 'bg_color': '#FFF3D6', 'border': 1, 'border_color': LIGHT_GREY})

# ── ABA 1: Painel Executivo
ws1 = workbook.add_worksheet('Painel Geral')
ws1.set_zoom(90)
ws1.hide_gridlines(2) # Mostra gridlines mas de forma suave

# Título
ws1.merge_range('B2:G2', f'PAINEL DE ADERÊNCIA - INSPEÇÕES 5S ({main_label.upper()})', f_title)
ws1.set_row(1, 35)
ws1.merge_range('B3:G3', f'Relatório Executivo · Gerado em {datetime.datetime.now().strftime("%d/%m/%Y às %H:%M")}', f_subtitle)

# Métricas Principais (KPIs)
tot_postos = sum(g['total'] for g in main_adherence_data)
tot_insp = sum(g['inspected'] for g in main_adherence_data)
adh_geral = round((tot_insp / tot_postos) * 100) if tot_postos > 0 else 0

# Cards
ws1.merge_range('B5:C5', 'TOTAL POSTOS ATIVOS', f_kpi_label)
ws1.merge_range('B6:C6', tot_postos, f_kpi_val)
ws1.merge_range('D5:E5', 'POSTOS INSPECCIONADOS', f_kpi_label)
ws1.merge_range('D6:E6', tot_insp, f_kpi_val)
ws1.merge_range('F5:G5', 'ADERÊNCIA GERAL', f_kpi_label)
ws1.merge_range('F6:G6', f'{adh_geral}%', f_kpi_val_pct)
ws1.set_row(4, 18)
ws1.set_row(5, 30)

# Tabela consolidada por Gerência
ws1.write('B9', 'Gerência (VP-4)', f_header)
ws1.write('C9', 'Total Postos', f_header)
ws1.write('D9', 'Inspecionados', f_header)
ws1.write('E9', 'Aderência (%)', f_header)
ws1.write('F9', 'Última Inspeção', f_header)
ws1.write('G9', 'Status', f_header)
ws1.set_row(8, 25)

row_idx = 10
for g in main_adherence_data:
    ws1.write(row_idx, 1, g['name'], f_group)
    ws1.write(row_idx, 2, g['total'], f_group)
    ws1.write(row_idx, 3, g['inspected'], f_group)
    ws1.write(row_idx, 4, g['adherence'], workbook.add_format({'bold': True, 'align': 'right', 'num_format': '0"%"', 'font_color': G, 'bg_color': LIGHT_G, 'border': 1, 'border_color': LIGHT_GREY}))
    ws1.write(row_idx, 5, format_date_br(g['last_date']), f_group)
    status_text = 'Concluído' if g['adherence'] == 100 else 'Pendente'
    ws1.write(row_idx, 6, status_text, f_status_done if status_text == 'Concluído' else f_status_pending)
    ws1.set_row(row_idx, 20)
    row_idx += 1

# Total Geral Tabela
ws1.write(row_idx, 1, 'TOTAL GERAL', f_total)
ws1.write(row_idx, 2, tot_postos, f_total)
ws1.write(row_idx, 3, tot_insp, f_total)
ws1.write(row_idx, 4, adh_geral, f_total)
ws1.write(row_idx, 5, '—', f_total)
ws1.write(row_idx, 6, 'Concluído' if adh_geral == 100 else 'Pendente', f_total)
ws1.set_row(row_idx, 22)

ws1.set_column('A:A', 3)
ws1.set_column('B:B', 32)
ws1.set_column('C:G', 16)

# ── ABA 2: Aderência Detalhada (Ativos)
ws2 = workbook.add_worksheet('Aderência Ativos')
ws2.set_zoom(90)
ws2.write('A1', 'Nível', f_header)
ws2.write('B1', 'Gerência', f_header)
ws2.write('C1', 'Coordenador / Dono', f_header)
ws2.write('D1', 'Quantidade Postos', f_header)
ws2.write('E1', 'Inspecionados', f_header)
ws2.write('F1', 'Aderência (%)', f_header)
ws2.write('G1', 'Última Inspeção', f_header)
ws2.write('H1', 'Status', f_header)
ws2.set_row(0, 25)

row_idx = 1
for g in main_adherence_data:
    # Gerência
    ws2.write(row_idx, 0, 'Gerência', f_group)
    ws2.write(row_idx, 1, g['name'], f_group)
    ws2.write(row_idx, 2, '', f_group)
    ws2.write(row_idx, 3, g['total'], f_group)
    ws2.write(row_idx, 4, g['inspected'], f_group)
    ws2.write(row_idx, 5, g['adherence'], workbook.add_format({'bold': True, 'align': 'right', 'num_format': '0"%"', 'font_color': G, 'bg_color': LIGHT_G, 'border': 1, 'border_color': LIGHT_GREY}))
    ws2.write(row_idx, 6, format_date_br(g['last_date']), f_group)
    status_text = 'Concluído' if g['adherence'] == 100 else 'Pendente'
    ws2.write(row_idx, 7, status_text, f_status_done if status_text == 'Concluído' else f_status_pending)
    ws2.set_row(row_idx, 20)
    row_idx += 1
    
    # Coordenadores
    for c in g['children']:
        ws2.write(row_idx, 0, 'Coordenador', f_child)
        ws2.write(row_idx, 1, g['name'], f_child)
        ws2.write(row_idx, 2, c['name'], f_child)
        ws2.write(row_idx, 3, c['total'], f_child)
        ws2.write(row_idx, 4, c['inspected'], f_child)
        ws2.write(row_idx, 5, c['adherence'], workbook.add_format({'align': 'right', 'num_format': '0"%"', 'border': 1, 'border_color': LIGHT_GREY}))
        ws2.write(row_idx, 6, format_date_br(c['last_date']), f_child)
        status_text = 'Concluído' if c['adherence'] == 100 else 'Pendente'
        ws2.write(row_idx, 7, status_text, f_status_done if status_text == 'Concluído' else f_status_pending)
        ws2.set_row(row_idx, 18)
        row_idx += 1
        
        # Missing posts inline
        for post in c.get('missing_posts', []):
            ws2.write(row_idx, 0, 'Posto Pendente', f_post_pending)
            ws2.write(row_idx, 1, g['name'], f_post_pending)
            ws2.write(row_idx, 2, f"  ↳ {post['code']} - {post['name']}", f_post_pending)
            ws2.write(row_idx, 3, '—', f_post_pending)
            ws2.write(row_idx, 4, '—', f_post_pending)
            ws2.write(row_idx, 5, 0, workbook.add_format({'align': 'right', 'num_format': '0"%"', 'font_color': '#7F5A00', 'bg_color': '#FFF3D6', 'border': 1, 'border_color': LIGHT_GREY}))
            ws2.write(row_idx, 6, '—', f_post_pending)
            ws2.write(row_idx, 7, 'Faltando', f_post_pending)
            ws2.set_row(row_idx, 16)
            row_idx += 1

# Total Geral
ws2.write(row_idx, 0, 'TOTAL', f_total)
ws2.write(row_idx, 1, '', f_total)
ws2.write(row_idx, 2, '', f_total)
ws2.write(row_idx, 3, tot_postos, f_total)
ws2.write(row_idx, 4, tot_insp, f_total)
ws2.write(row_idx, 5, adh_geral, f_total)
ws2.write(row_idx, 6, '—', f_total)
ws2.write(row_idx, 7, 'Concluído' if adh_geral == 100 else 'Pendente', f_total)
ws2.set_row(row_idx, 22)

ws2.set_column('A:A', 12)
ws2.set_column('B:B', 30)
ws2.set_column('C:C', 26)
ws2.set_column('D:H', 15)

# ── ABA 3: Postos Pendentes
ws3 = workbook.add_worksheet('Postos Pendentes')
ws3.set_zoom(90)
f_header_pending = workbook.add_format({'bold': True, 'font_name': 'Segoe UI', 'font_size': 10, 'font_color': '#FFFFFF', 'bg_color': Y, 'border': 1, 'border_color': Y, 'align': 'center', 'valign': 'vcenter'})
f_coord_header = workbook.add_format({'bold': True, 'font_name': 'Segoe UI', 'font_size': 9, 'font_color': '#7F5A00', 'bg_color': '#FFF3D6', 'border': 1, 'border_color': LIGHT_GREY})

ws3.write('A1', 'Código do Posto', f_header_pending)
ws3.write('B1', 'Nome do Posto', f_header_pending)
ws3.write('C1', 'Coordenador / Dono', f_header_pending)
ws3.write('D1', 'Gerência (VP-4)', f_header_pending)
ws3.set_row(0, 25)

# Agrupar postos pendentes por coordenador e gerência para o principal
pending_by_coord = {}
for p in main_uninspected:
    key = (p['coordenador'], p['gerencia'])
    if key not in pending_by_coord:
        pending_by_coord[key] = []
    pending_by_coord[key].append(p)

sorted_coords = sorted(pending_by_coord.items(), key=lambda x: len(x[1]), reverse=True)

row_idx = 1
for (coord, ger), posts in sorted_coords:
    ws3.merge_range(row_idx, 0, row_idx, 2, f"Coordenador: {coord} ({ger})", f_coord_header)
    ws3.write(row_idx, 3, f"Faltam {len(posts)}", f_coord_header)
    ws3.set_row(row_idx, 20)
    row_idx += 1
    for p in posts:
        ws3.write(row_idx, 0, p['codigo'], f_child)
        ws3.write(row_idx, 1, p['nome'], f_child)
        ws3.write(row_idx, 2, p['coordenador'], f_child)
        ws3.write(row_idx, 3, p['gerencia'], f_child)
        ws3.set_row(row_idx, 18)
        row_idx += 1

ws3.set_column('A:A', 15)
ws3.set_column('B:B', 32)
ws3.set_column('C:C', 26)
ws3.set_column('D:D', 30)

# Incluir abas de Acumulado secundárias se o principal for o mensal
if extra_adherence_data is not None:
    ws4 = workbook.add_worksheet("Aderência Acumulado")
    ws4.set_zoom(90)
    ws4.write('A1', 'Nível', f_header)
    ws4.write('B1', 'Gerência', f_header)
    ws4.write('C1', 'Coordenador / Dono', f_header)
    ws4.write('D1', 'Quantidade Postos', f_header)
    ws4.write('E1', 'Inspecionados', f_header)
    ws4.write('F1', 'Aderência (%)', f_header)
    ws4.write('G1', 'Última Inspeção', f_header)
    ws4.write('H1', 'Status', f_header)
    ws4.set_row(0, 25)

    row_idx = 1
    tot_postos_e = sum(g['total'] for g in extra_adherence_data)
    tot_insp_e = sum(g['inspected'] for g in extra_adherence_data)
    adh_geral_e = round((tot_insp_e / tot_postos_e) * 100) if tot_postos_e > 0 else 0

    for g in extra_adherence_data:
        ws4.write(row_idx, 0, 'Gerência', f_group)
        ws4.write(row_idx, 1, g['name'], f_group)
        ws4.write(row_idx, 2, '', f_group)
        ws4.write(row_idx, 3, g['total'], f_group)
        ws4.write(row_idx, 4, g['inspected'], f_group)
        ws4.write(row_idx, 5, g['adherence'], workbook.add_format({'bold': True, 'align': 'right', 'num_format': '0"%"', 'font_color': G, 'bg_color': LIGHT_G, 'border': 1, 'border_color': LIGHT_GREY}))
        ws4.write(row_idx, 6, format_date_br(g['last_date']), f_group)
        status_text = 'Concluído' if g['adherence'] == 100 else 'Pendente'
        ws4.write(row_idx, 7, status_text, f_status_done if status_text == 'Concluído' else f_status_pending)
        ws4.set_row(row_idx, 20)
        row_idx += 1
        
        for c in g['children']:
            ws4.write(row_idx, 0, 'Coordenador', f_child)
            ws4.write(row_idx, 1, g['name'], f_child)
            ws4.write(row_idx, 2, c['name'], f_child)
            ws4.write(row_idx, 3, c['total'], f_child)
            ws4.write(row_idx, 4, c['inspected'], f_child)
            ws4.write(row_idx, 5, c['adherence'], workbook.add_format({'align': 'right', 'num_format': '0"%"', 'border': 1, 'border_color': LIGHT_GREY}))
            ws4.write(row_idx, 6, format_date_br(c['last_date']), f_child)
            status_text = 'Concluído' if c['adherence'] == 100 else 'Pendente'
            ws4.write(row_idx, 7, status_text, f_status_done if status_text == 'Concluído' else f_status_pending)
            ws4.set_row(row_idx, 18)
            row_idx += 1
            
            # Missing posts inline
            for post in c.get('missing_posts', []):
                ws4.write(row_idx, 0, 'Posto Pendente', f_post_pending)
                ws4.write(row_idx, 1, g['name'], f_post_pending)
                ws4.write(row_idx, 2, f"  ↳ {post['code']} - {post['name']}", f_post_pending)
                ws4.write(row_idx, 3, '—', f_post_pending)
                ws4.write(row_idx, 4, '—', f_post_pending)
                ws4.write(row_idx, 5, 0, workbook.add_format({'align': 'right', 'num_format': '0"%"', 'font_color': '#7F5A00', 'bg_color': '#FFF3D6', 'border': 1, 'border_color': LIGHT_GREY}))
                ws4.write(row_idx, 6, '—', f_post_pending)
                ws4.write(row_idx, 7, 'Faltando', f_post_pending)
                ws4.set_row(row_idx, 16)
                row_idx += 1

    ws4.write(row_idx, 0, 'TOTAL', f_total)
    ws4.write(row_idx, 1, '', f_total)
    ws4.write(row_idx, 2, '', f_total)
    ws4.write(row_idx, 3, tot_postos_e, f_total)
    ws4.write(row_idx, 4, tot_insp_e, f_total)
    ws4.write(row_idx, 5, adh_geral_e, f_total)
    ws4.write(row_idx, 6, '—', f_total)
    ws4.write(row_idx, 7, 'Concluído' if adh_geral_e == 100 else 'Pendente', f_total)
    ws4.set_row(row_idx, 22)

    ws4.set_column('A:A', 12)
    ws4.set_column('B:B', 30)
    ws4.set_column('C:C', 26)
    ws4.set_column('D:H', 15)

    ws5 = workbook.add_worksheet("Pendentes Acumulado")
    ws5.set_zoom(90)
    ws5.write('A1', 'Código do Posto', f_header_pending)
    ws5.write('B1', 'Nome do Posto', f_header_pending)
    ws5.write('C1', 'Coordenador / Dono', f_header_pending)
    ws5.write('D1', 'Gerência (VP-4)', f_header_pending)
    ws5.set_row(0, 25)

    pending_by_coord_e = {}
    for p in extra_uninspected:
        key = (p['coordenador'], p['gerencia'])
        if key not in pending_by_coord_e:
            pending_by_coord_e[key] = []
        pending_by_coord_e[key].append(p)

    sorted_coords_e = sorted(pending_by_coord_e.items(), key=lambda x: len(x[1]), reverse=True)

    row_idx = 1
    for (coord, ger), posts in sorted_coords_e:
        ws5.merge_range(row_idx, 0, row_idx, 2, f"Coordenador: {coord} ({ger})", f_coord_header)
        ws5.write(row_idx, 3, f"Faltam {len(posts)}", f_coord_header)
        ws5.set_row(row_idx, 20)
        row_idx += 1
        for p in posts:
            ws5.write(row_idx, 0, p['codigo'], f_child)
            ws5.write(row_idx, 1, p['nome'], f_child)
            ws5.write(row_idx, 2, p['coordenador'], f_child)
            ws5.write(row_idx, 3, p['gerencia'], f_child)
            ws5.set_row(row_idx, 18)
            row_idx += 1

    ws5.set_column('A:A', 15)
    ws5.set_column('B:B', 32)
    ws5.set_column('C:C', 26)
    ws5.set_column('D:D', 30)

workbook.close()
print("Excel formatado com sucesso!")


# 6. GERAÇÃO DO PDF EXECUTIVO DE ALTO IMPACTO (LIMITADO A 1 ou 2 PÁGINAS)
pdf_name = 'Relatorio_Aderencia_Vale.pdf'
print(f"Gerando PDF resumido: {pdf_name}...")

doc = SimpleDocTemplate(
    pdf_name,
    pagesize=A4,
    leftMargin=30,
    rightMargin=30,
    topMargin=30,
    bottomMargin=30
)

styles = getSampleStyleSheet()

# Custom Paragraph Styles
style_title = ParagraphStyle(
    name='ValeTitle',
    fontName='Helvetica-Bold',
    fontSize=18,
    textColor=colors.HexColor(G),
    spaceAfter=6,
    alignment=0  # Left aligned
)

style_subtitle = ParagraphStyle(
    name='ValeSubtitle',
    fontName='Helvetica',
    fontSize=10,
    textColor=colors.HexColor(GREY),
    spaceAfter=10
)

style_section = ParagraphStyle(
    name='ValeSection',
    fontName='Helvetica-Bold',
    fontSize=12,
    textColor=colors.HexColor(G),
    spaceBefore=10,
    spaceAfter=5
)

style_body = ParagraphStyle(
    name='ValeBody',
    fontName='Helvetica',
    fontSize=9,
    textColor=colors.HexColor('#333333'),
    leading=12
)

style_kpi_num = ParagraphStyle(
    name='ValeKPINum',
    fontName='Helvetica-Bold',
    fontSize=22,
    textColor=colors.HexColor(G),
    alignment=1,  # Center
    leading=26
)

style_kpi_lbl = ParagraphStyle(
    name='ValeKPILbl',
    fontName='Helvetica-Bold',
    fontSize=8,
    textColor=colors.HexColor(GREY),
    alignment=1,  # Center
    leading=10
)

style_table_header = ParagraphStyle(
    name='ValeTableHeader',
    fontName='Helvetica-Bold',
    fontSize=9,
    textColor=colors.white,
    alignment=1
)

style_table_cell = ParagraphStyle(
    name='ValeTableCell',
    fontName='Helvetica',
    fontSize=9,
    textColor=colors.HexColor('#333333')
)

style_table_cell_bold = ParagraphStyle(
    name='ValeTableCellBold',
    fontName='Helvetica-Bold',
    fontSize=9,
    textColor=colors.HexColor(G)
)

style_status_done = ParagraphStyle(
    name='ValeStatusDone',
    fontName='Helvetica-Bold',
    fontSize=8,
    textColor=colors.HexColor(G),
    alignment=1
)

style_status_pending = ParagraphStyle(
    name='ValeStatusPending',
    fontName='Helvetica-Bold',
    fontSize=8,
    textColor=colors.HexColor(Y),
    alignment=1
)

story = []

# --- CABEÇALHO ---
header_data = [
    [
        Paragraph("<b>VALE ANALYTICS</b>", ParagraphStyle('ValeBrand', fontName='Helvetica-Bold', fontSize=12, textColor=colors.HexColor(G))),
        Paragraph("PAINEL DE ADERÊNCIA 5S", ParagraphStyle('ValeReportName', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor(GREY), alignment=2))
    ]
]
header_table = Table(header_data, colWidths=[200, 335])
header_table.setStyle(TableStyle([
    ('LINEBELOW', (0,0), (-1,-1), 1, colors.HexColor(G)),
    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ('TOPPADDING', (0,0), (-1,-1), 0),
]))
story.append(header_table)
story.append(Spacer(1, 8))

# --- TÍTULO DO DOCUMENTO ---
story.append(Paragraph("Relatório Executivo de Aderência", style_title))
period_text = f"Acumulado do ano de 2026 (Janeiro a Maio) · Gerado em {datetime.datetime.now().strftime('%d/%m/%Y às %H:%M')}"
story.append(Paragraph(period_text, style_subtitle))

# --- KPI DASHBOARD (3 CARDS) ---
kpi_data = [
    [
        Paragraph("POSTOS ATIVOS", style_kpi_lbl),
        Paragraph("POSTOS INSPECCIONADOS", style_kpi_lbl),
        Paragraph("ADERÊNCIA GERAL", style_kpi_lbl)
    ],
    [
        Paragraph(f"{tot_postos}", style_kpi_num),
        Paragraph(f"{tot_insp}", style_kpi_num),
        Paragraph(f"{adh_geral}%", ParagraphStyle('KPINumPct', parent=style_kpi_num, textColor=colors.HexColor(Y) if adh_geral < 80 else colors.HexColor(G)))
    ]
]
kpi_table = Table(kpi_data, colWidths=[178, 178, 179])
kpi_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(LIGHT_G)),
    ('BOX', (0,0), (-1,-1), 1, colors.HexColor(G)),
    ('INNERGRID', (0,0), (-1,-1), 0.5, colors.white),
    ('TOPPADDING', (0,0), (-1,0), 6),
    ('BOTTOMPADDING', (0,0), (-1,0), 2),
    ('TOPPADDING', (0,1), (-1,1), 2),
    ('BOTTOMPADDING', (0,1), (-1,1), 8),
    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
]))
story.append(kpi_table)
story.append(Spacer(1, 10))

# --- SEÇÃO 1: TABELA CONSOLIDADA ---
story.append(Paragraph("Aderência Consolidada por Gerência", style_section))

table_rows = [[
    Paragraph("<b>Gerência (VP-4)</b>", style_table_header),
    Paragraph("<b>Total Postos</b>", style_table_header),
    Paragraph("<b>Inspecionados</b>", style_table_header),
    Paragraph("<b>Aderência</b>", style_table_header),
    Paragraph("<b>Última Inspeção</b>", style_table_header),
    Paragraph("<b>Status</b>", style_table_header)
]]

# Preencher com as Gerências e seus Coordenadores
gerencia_row_indices = []
for idx, g in enumerate(data_acumulado_ativos):
    ger_row_idx = len(table_rows)
    gerencia_row_indices.append(ger_row_idx)
    
    status_text = '✓ Concluído' if g['adherence'] == 100 else '⏳ Pendente'
    status_style = style_status_done if g['adherence'] == 100 else style_status_pending
    
    table_rows.append([
        Paragraph(g['name'], style_table_cell_bold),
        Paragraph(str(g['total']), style_table_cell_bold),
        Paragraph(str(g['inspected']), style_table_cell_bold),
        Paragraph(f"<b>{g['adherence']}%</b>", ParagraphStyle(f'CellAdhG_{idx}', parent=style_table_cell, fontName='Helvetica-Bold', textColor=colors.HexColor(G) if g['adherence'] >= 80 else colors.HexColor(Y))),
        Paragraph(format_date_br(g['last_date']), style_table_cell_bold),
        Paragraph(status_text, status_style)
    ])
    
    # Coordenadores Rows
    for c_idx, c in enumerate(g['children']):
        c_status_text = '✓ Concluído' if c['adherence'] == 100 else '⏳ Pendente'
        c_status_style = style_status_done if c['adherence'] == 100 else style_status_pending
        
        indent_style = ParagraphStyle(
            f'ChildCell_{idx}_{c_idx}',
            parent=style_table_cell,
            leftIndent=15,
            textColor=colors.HexColor('#555555')
        )
        
        table_rows.append([
            Paragraph(f"↳ {c['name']}", indent_style),
            Paragraph(str(c['total']), style_table_cell),
            Paragraph(str(c['inspected']), style_table_cell),
            Paragraph(f"{c['adherence']}%", ParagraphStyle(f'CellAdhC_{idx}_{c_idx}', parent=style_table_cell, textColor=colors.HexColor(G) if c['adherence'] >= 80 else colors.HexColor(Y))),
            Paragraph(format_date_br(c['last_date']), style_table_cell),
            Paragraph(c_status_text, c_status_style)
        ])

# Linha de total
table_rows.append([
    Paragraph("<b>TOTAL GERAL</b>", style_table_cell_bold),
    Paragraph(f"<b>{tot_postos}</b>", style_table_cell_bold),
    Paragraph(f"<b>{tot_insp}</b>", style_table_cell_bold),
    Paragraph(f"<b>{adh_geral}%</b>", ParagraphStyle('TotalAdh', parent=style_table_cell_bold, textColor=colors.HexColor(G) if adh_geral >= 80 else colors.HexColor(Y))),
    Paragraph("—", style_table_cell),
    Paragraph('✓ Concluído' if adh_geral == 100 else '⏳ Pendente', style_status_done if adh_geral == 100 else style_status_pending)
])

# Estilo da tabela
tbl_style = TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor(G)),
    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ('TOPPADDING', (0,0), (-1,-1), 2),
    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor(LIGHT_GREY)),
    ('LINEBELOW', (0,-1), (-1,-1), 1.5, colors.HexColor(G)),
])

# Aplicar background na linha de cada Gerência
for r_idx in gerencia_row_indices:
    tbl_style.add('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor(LIGHT_G))

# Aplicar background na linha de total
tbl_style.add('BACKGROUND', (0, -1), (-1, -1), colors.HexColor(LIGHT_G))

table = Table(table_rows, colWidths=[225, 60, 70, 60, 60, 60], style=tbl_style, repeatRows=1)
story.append(table)
story.append(Spacer(1, 10))

# --- SEÇÃO 2: DETALHAMENTO DE PENDÊNCIAS ---
story.append(PageBreak()) # Move pending details to page 2 for clean formatting
story.append(Paragraph("Detalhamento de Postos Pendentes por Coordenador", style_section))

# 2.1. Acumulado
story.append(Paragraph("<b>1. Postos Pendentes no Acumulado Geral (Janeiro a Maio)</b>", ParagraphStyle('SubSecTitle1', parent=style_body, fontName='Helvetica-Bold', fontSize=10, spaceBefore=8, spaceAfter=4)))

pending_by_coord = {}
for p in uninspected_acumulado_ativos:
    key = (p['coordenador'], p['gerencia'])
    if key not in pending_by_coord:
        pending_by_coord[key] = []
    pending_by_coord[key].append(p)

sorted_coords = sorted(pending_by_coord.items(), key=lambda x: len(x[1]), reverse=True)

if not sorted_coords:
    story.append(Paragraph("✓ Todos os postos ativos foram inspecionados no acumulado do ano! Excelente nível de aderência.", ParagraphStyle('NoPendAcum', parent=style_body, textColor=colors.HexColor(G), spaceAfter=15)))
else:
    style_pending_cell = ParagraphStyle(
        name='ValePendingCell',
        parent=style_body,
        fontName='Helvetica',
        fontSize=7,
        leading=8.5
    )
    style_pending_header = ParagraphStyle(
        name='ValePendingHeader',
        parent=style_table_header,
        fontSize=7,
        leading=8.5
    )
    style_pending_crd = ParagraphStyle(
        name='ValePendingCrd',
        parent=style_body,
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=8.5,
        textColor=colors.HexColor('#7F5A00')
    )

    pending_rows = [[
        Paragraph("<b>Código do Posto / Nome do Posto</b>", style_pending_header),
        Paragraph("<b>Coordenador / Dono</b>", style_pending_header),
        Paragraph("<b>Gerência (VP-4)</b>", style_pending_header),
        Paragraph("<b>Status</b>", style_pending_header)
    ]]
    
    pending_table_style = TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor(Y)),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0.5),
        ('TOPPADDING', (0,0), (-1,-1), 0.5),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor(LIGHT_GREY)),
    ])
    
    r_idx = 1
    for (coord, ger), posts in sorted_coords:
        pending_rows.append([
            Paragraph(f"Coordenador: {coord} ({ger})", style_pending_crd),
            Paragraph("", style_body),
            Paragraph("", style_body),
            Paragraph(f"Faltam {len(posts)}", ParagraphStyle('FltPdfA', parent=style_pending_crd, alignment=2))
        ])
        pending_table_style.add('SPAN', (0, r_idx), (2, r_idx))
        pending_table_style.add('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor('#FFF3D6'))
        r_idx += 1
        
        for p in posts:
            pending_rows.append([
                Paragraph(f"↳ {p['codigo']} - {p['nome']}", style_pending_cell),
                Paragraph(p['coordenador'], style_pending_cell),
                Paragraph(p['gerencia'], style_pending_cell),
                Paragraph("⏳ Pendente", ParagraphStyle('FltPendingStatusA', parent=style_status_pending, fontSize=7, leading=8.5))
            ])
            r_idx += 1
            
    pending_table = Table(pending_rows, colWidths=[250, 115, 115, 55], style=pending_table_style, repeatRows=1)
    story.append(pending_table)
    story.append(Spacer(1, 10))

# 2.2. Mensal
if recent_period:
    story.append(Paragraph(f"<b>2. Postos Pendentes no Mês Atual ({recent_period['label']})</b>", ParagraphStyle('SubSecTitle2', parent=style_body, fontName='Helvetica-Bold', fontSize=10, spaceBefore=8, spaceAfter=4)))
    
    pending_by_coord_m = {}
    for p in uninspected_mensal_ativos:
        key = (p['coordenador'], p['gerencia'])
        if key not in pending_by_coord_m:
            pending_by_coord_m[key] = []
        pending_by_coord_m[key].append(p)
        
    sorted_coords_m = sorted(pending_by_coord_m.items(), key=lambda x: len(x[1]), reverse=True)
    
    if not sorted_coords_m:
        story.append(Paragraph(f"✓ Todos os postos ativos foram inspecionados em {recent_period['label']}!", ParagraphStyle('NoPendMen', parent=style_body, textColor=colors.HexColor(G))))
    else:
        style_pending_cell = ParagraphStyle(
            name='ValePendingCellM',
            parent=style_body,
            fontName='Helvetica',
            fontSize=7,
            leading=8.5
        )
        style_pending_header = ParagraphStyle(
            name='ValePendingHeaderM',
            parent=style_table_header,
            fontSize=7,
            leading=8.5
        )
        style_pending_crd = ParagraphStyle(
            name='ValePendingCrdM',
            parent=style_body,
            fontName='Helvetica-Bold',
            fontSize=7,
            leading=8.5,
            textColor=colors.HexColor('#7F5A00')
        )

        pending_rows_m = [[
            Paragraph("<b>Código do Posto / Nome do Posto</b>", style_pending_header),
            Paragraph("<b>Coordenador / Dono</b>", style_pending_header),
            Paragraph("<b>Gerência (VP-4)</b>", style_pending_header),
            Paragraph("<b>Status</b>", style_pending_header)
        ]]
        
        pending_table_style_m = TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor(Y)),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0.5),
            ('TOPPADDING', (0,0), (-1,-1), 0.5),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor(LIGHT_GREY)),
        ])
        
        r_idx = 1
        for (coord, ger), posts in sorted_coords_m:
            pending_rows_m.append([
                Paragraph(f"Coordenador: {coord} ({ger})", style_pending_crd),
                Paragraph("", style_body),
                Paragraph("", style_body),
                Paragraph(f"Faltam {len(posts)}", ParagraphStyle('FltPdfM', parent=style_pending_crd, alignment=2))
            ])
            pending_table_style_m.add('SPAN', (0, r_idx), (2, r_idx))
            pending_table_style_m.add('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor('#FFF3D6'))
            r_idx += 1
            
            for p in posts:
                pending_rows_m.append([
                    Paragraph(f"↳ {p['codigo']} - {p['nome']}", style_pending_cell),
                    Paragraph(p['coordenador'], style_pending_cell),
                    Paragraph(p['gerencia'], style_pending_cell),
                    Paragraph("⏳ Pendente", ParagraphStyle('FltPendingStatusM', parent=style_status_pending, fontSize=7, leading=8.5))
                ])
                r_idx += 1
                
        pending_table_m = Table(pending_rows_m, colWidths=[250, 115, 115, 55], style=pending_table_style_m, repeatRows=1)
        story.append(pending_table_m)

# --- RODAPÉ CORPORATIVO ---
def add_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor(G))
    canvas.setLineWidth(0.5)
    canvas.line(30, 30, 565, 30)
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor(GREY))
    canvas.drawString(30, 18, "Documento Confidencial - Vale S.A.")
    canvas.drawRightString(565, 18, f"Página {doc.page}")
    canvas.restoreState()

doc.build(story, onFirstPage=add_footer, onLaterPages=add_footer)
print("PDF executivo formatado com sucesso!")
