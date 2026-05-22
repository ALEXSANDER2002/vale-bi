const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');
const XLSX = require('xlsx');

// 1. Configurações de colunas e arquivos
const baseFile = path.join(__dirname, 'data (10) (1)(Base de dados 2026).csv');
const exportFile = path.join(__dirname, 'data (10) (1)(Export).csv');

if (!fs.existsSync(baseFile) || !fs.existsSync(exportFile)) {
  console.error('Erro: Arquivos de dados não encontrados no diretório raiz!');
  process.exit(1);
}

// Ler arquivos usando encoding latin1 (Windows-1252) para ler os acentos corretamente
const baseRaw = fs.readFileSync(baseFile, 'latin1');
const exportRaw = fs.readFileSync(exportFile, 'latin1');

// Função para auto-detectar delimitador
function detectDelimiter(text) {
  const firstLine = text.split('\n')[0] || '';
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

const baseDelim = detectDelimiter(baseRaw);
const exportDelim = detectDelimiter(exportRaw);

const baseParsed = Papa.parse(baseRaw, { header: true, skipEmptyLines: true, delimiter: baseDelim });
const exportParsed = Papa.parse(exportRaw, { header: true, skipEmptyLines: true, delimiter: exportDelim });

const baseRows = baseParsed.data;
const exportRows = exportParsed.data;

console.log(`Base carregada: ${baseRows.length} linhas`);
console.log(`Export carregado: ${exportRows.length} linhas`);

// Identificar cabeçalhos
const baseHeaders = baseParsed.meta.fields || [];
const exportHeaders = exportParsed.meta.fields || [];

// Encontrar colunas correspondentes (reproduzindo heurística da aplicação)
const codeCol = baseHeaders.find(h => /CodigoPosto|WorkstationCode/i.test(h)) || baseHeaders[0];
const statusCol = baseHeaders.find(h => /StatusPosto|WorkstationStatus/i.test(h));
const nameCol = baseHeaders.find(h => /NomePosto|WorkstationName/i.test(h));
const ownerCol = baseHeaders.find(h => /DonoPosto\/WorkstationOwner/i.test(h)) || baseHeaders.find(h => /DonoPosto/i.test(h));
const gerenciaCol = baseHeaders.find(h => /VP-4/i.test(h)) || baseHeaders.find(h => /VP-3/i.test(h)) || baseHeaders.find(h => /gerencia|gerência/i.test(h));

const inspCol = exportHeaders.find(h => /T.tulo do Incidente/i.test(h)) || exportHeaders.find(h => /titulo|título/i.test(h)) || exportHeaders[0];
const dateCol = exportHeaders.find(h => /Data Incidente/i.test(h)) || exportHeaders.find(h => /data/i.test(h));

console.log('\nMapeamento de Colunas Detectado:');
console.log(` - Código (Base):        "${codeCol}"`);
console.log(` - Status (Base):        "${statusCol || 'Não Encontrada'}"`);
console.log(` - Nome do Posto (Base):  "${nameCol || 'Não Encontrada'}"`);
console.log(` - Coordenador (Base):    "${ownerCol || 'Não Encontrada'}"`);
console.log(` - Gerência (Base):       "${gerenciaCol || 'Não Encontrada'}"`);
console.log(` - Ref. Posto (Export):  "${inspCol}"`);
console.log(` - Data (Export):        "${dateCol || 'Não Encontrada'}"`);

// Função para extrair código (ex: POST-011494)
function extractCode(value) {
  if (!value) return null;
  const trimmed = value.trim();
  
  // 1. Tenta correspondência direta
  const direct = normalizePostCode(trimmed);
  if (direct) return direct;

  // 2. Tenta extrair do texto
  const pattern = /(?:POSTO|POST|WORKSTATION|WKS|WS)[\s\-_–—]*([A-Za-z0-9]{2,})/gi;
  pattern.lastIndex = 0;
  const match = pattern.exec(trimmed);
  if (match && match[1]) {
    return toPostCode(match[1]);
  }
  return null;
}

function normalizePostCode(code) {
  const cleaned = code.trim().replace(/\s+/g, '').replace(/[–—_]/g, '-').toUpperCase();
  const withPrefix = cleaned.match(/^(?:POST-?|POSTO-?|WORKSTATION-?|WKS-?|WS-?)([A-Z0-9]{2,})$/i);
  if (withPrefix) return toPostCode(withPrefix[1]);
  if (/^\d{4,}$/.test(cleaned)) return `POST-${normalizePostDigits(cleaned)}`;
  return null;
}

function normalizePostDigits(digits) {
  const d = digits.replace(/\D/g, '');
  if (!d) return '';
  if (d.length > 0 && d.length < 6) return d.padStart(6, '0');
  return d;
}

function toPostCode(suffix) {
  const s = suffix.replace(/\s+/g, '').toUpperCase();
  if (!s || s.length < 2) return null;
  if (!/^[A-Z0-9]+$/.test(s)) return null;
  if (!/\d/.test(s)) return null;
  if (/^\d+$/.test(s)) return `POST-${normalizePostDigits(s)}`;
  return `POST-${s}`;
}

// Data parser para comparação
function parseToComparableDate(raw) {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const dmy = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const months = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const dMonY = raw.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})/);
  if (dMonY) {
    const m = months[dMonY[2].toLowerCase()];
    if (m) return `${dMonY[3]}-${m}-${dMonY[1]}`;
  }
  return raw;
}

// Formatar data em português BR
function formatDateBR(iso) {
  if (!iso || iso === '—') return '—';
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Determinar o período do mês mais recente no Export
let maxDate = '';
for (const row of exportRows) {
  const parsed = parseToComparableDate(row[dateCol] || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(parsed) && parsed > maxDate) {
    maxDate = parsed;
  }
}

let recentPeriod = null;
if (maxDate) {
  const [year, month] = maxDate.split('-');
  const lastDay = new Date(Number(year), Number(month), 0).getDate();
  recentPeriod = {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
    label: `${month}/${year}`
  };
  console.log(`Mês mais recente detectado: ${recentPeriod.label} (${recentPeriod.from} a ${recentPeriod.to})`);
}

// Função para construir o mapa de códigos inspecionados
function buildInspectedMap(filterPeriod = null) {
  const map = new Map();
  for (const r of exportRows) {
    const raw = r[inspCol] || '';
    const code = extractCode(raw);
    if (!code) continue;

    if (filterPeriod) {
      const rowDate = parseToComparableDate(r[dateCol] || '');
      if (rowDate < filterPeriod.from || rowDate > filterPeriod.to) continue;
    }

    const date = parseToComparableDate(r[dateCol] || '');
    const existing = map.get(code);
    if (!existing || date > existing) {
      map.set(code, date);
    }
  }
  return map;
}

// Filtro de status "Ativo"
function isRowActive(row) {
  if (!statusCol) return true;
  const val = (row[statusCol] || '').toLowerCase().trim();
  return val === 'ativo' || val === 'active' || val === 'a' || val === 'sim' || val === 'yes' || val === '1' || val === 'true' || (val.startsWith('ativ') && !val.startsWith('inativ'));
}

// Processamento
function calculateAdherence(statusFilterActive = true, filterPeriod = null) {
  const inspectedMap = buildInspectedMap(filterPeriod);
  
  const filteredBase = baseRows.filter(r => {
    const active = isRowActive(r);
    return statusFilterActive ? active : !active;
  });

  const tree = new Map();
  const uninspected = [];

  for (const r of filteredBase) {
    const raw = r[codeCol] || '';
    const code = extractCode(raw);
    if (!code) continue;

    const group = r[gerenciaCol] || 'N/A';
    const sub = r[ownerCol] || 'N/A';

    if (!tree.has(group)) tree.set(group, new Map());
    const subMap = tree.get(group);
    if (!subMap.has(sub)) subMap.set(sub, new Set());
    subMap.get(sub).add(code);

    if (!inspectedMap.has(code)) {
      uninspected.push({
        codigo: code,
        nome: r[nameCol] || '—',
        coordenador: sub,
        gerencia: group
      });
    }
  }

  const codeToName = new Map();
  for (const r of filteredBase) {
    const raw = r[codeCol] || '';
    const code = extractCode(raw);
    if (code) {
      codeToName.set(code, r[nameCol] || '—');
    }
  }

  const results = [];
  for (const [groupName, subMap] of tree.entries()) {
    const children = [];
    for (const [subName, codes] of subMap.entries()) {
      const total = codes.size;
      const inspectedList = [...codes].filter(c => inspectedMap.has(c));
      const inspected = inspectedList.length;
      const adherence = total > 0 ? Math.round((inspected / total) * 100) : 0;
      
      const dates = inspectedList.map(c => inspectedMap.get(c)).filter(Boolean);
      const lastInspectionDate = dates.sort().pop() || '—';

      const missingPosts = [...codes]
        .filter(c => !inspectedMap.has(c))
        .map(c => ({
          code: c,
          name: codeToName.get(c) || '—'
        }));

      children.push({
        name: subName,
        total,
        inspected,
        adherence,
        lastInspectionDate,
        missingPosts
      });
    }
    
    children.sort((a, b) => b.total - a.total);

    const total = children.reduce((s, c) => s + c.total, 0);
    const inspected = children.reduce((s, c) => s + c.inspected, 0);
    const adherence = total > 0 ? Math.round((inspected / total) * 100) : 0;
    
    const dates = children.map(c => c.lastInspectionDate).filter(d => d && d !== '—');
    const lastInspectionDate = dates.sort().pop() || '—';

    results.push({
      name: groupName,
      total,
      inspected,
      adherence,
      lastInspectionDate,
      children
    });
  }

  results.sort((a, b) => b.total - a.total);

  return { results, uninspected };
}

// Executar cruzamento
const dataAcumuladoAtivos = calculateAdherence(true, null);
const dataMensalAtivos = recentPeriod ? calculateAdherence(true, recentPeriod) : null;
const dataAcumuladoInativos = calculateAdherence(false, null);

// 2. Gerar planilhas Excel (XLSX)
const wb = XLSX.utils.book_new();

// Planilha 1: Resumo Geral
const summaryData = [
  ['RELATÓRIO DE ADERÊNCIA DE INSPEÇÕES 5S - VALE S.A.'],
  [],
  ['Métrica', 'Postos Ativos (Acumulado)', `Postos Ativos (${recentPeriod ? recentPeriod.label : 'Mês Recente'})`, 'Postos Inativos (Acumulado)'],
  ['Total de Postos', 
    dataAcumuladoAtivos.results.reduce((s, g) => s + g.total, 0),
    dataMensalAtivos ? dataMensalAtivos.results.reduce((s, g) => s + g.total, 0) : 0,
    dataAcumuladoInativos.results.reduce((s, g) => s + g.total, 0)
  ],
  ['Postos Inspecionados', 
    dataAcumuladoAtivos.results.reduce((s, g) => s + g.inspected, 0),
    dataMensalAtivos ? dataMensalAtivos.results.reduce((s, g) => s + g.inspected, 0) : 0,
    dataAcumuladoInativos.results.reduce((s, g) => s + g.inspected, 0)
  ],
  ['Aderência Geral (%)', 
    `${Math.round((dataAcumuladoAtivos.results.reduce((s, g) => s + g.inspected, 0) / (dataAcumuladoAtivos.results.reduce((s, g) => s + g.total, 0) || 1)) * 100)}%`,
    dataMensalAtivos ? `${Math.round((dataMensalAtivos.results.reduce((s, g) => s + g.inspected, 0) / (dataMensalAtivos.results.reduce((s, g) => s + g.total, 0) || 1)) * 100)}%` : '0%',
    `${Math.round((dataAcumuladoInativos.results.reduce((s, g) => s + g.inspected, 0) / (dataAcumuladoInativos.results.reduce((s, g) => s + g.total, 0) || 1)) * 100)}%`
  ],
  [],
  ['Data de Geração:', new Date().toLocaleString('pt-BR')]
];
const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Geral');

// Função auxiliar para mapear tabela hierárquica para linhas de planilha
function flattenHierarchyToRows(results) {
  const rows = [['Nível', 'Gerência', 'Coordenador / Dono', 'Qtde Postos', 'Inspecionados', 'Aderência (%)', 'Última Inspeção', 'Status']];
  results.forEach(g => {
    rows.push([
      'Gerência',
      g.name,
      '',
      g.total,
      g.inspected,
      `${g.adherence}%`,
      formatDateBR(g.lastInspectionDate),
      g.adherence === 100 ? 'Concluído' : 'Pendente'
    ]);
    g.children.forEach(c => {
      rows.push([
        'Coordenador',
        g.name,
        c.name,
        c.total,
        c.inspected,
        `${c.adherence}%`,
        formatDateBR(c.lastInspectionDate),
        c.adherence === 100 ? 'Concluído' : 'Pendente'
      ]);
      if (c.missingPosts && c.missingPosts.length > 0) {
        c.missingPosts.forEach(post => {
          rows.push([
            'Posto Pendente',
            g.name,
            `  ↳ ${post.code} - ${post.name}`,
            '—',
            '—',
            '0%',
            '—',
            'Faltando'
          ]);
        });
      }
    });
  });
  return XLSX.utils.aoa_to_sheet(rows);
}

function generateGroupedPendingSheet(uninspected) {
  const headers = ['Código do Posto', 'Nome do Posto', 'Coordenador / Dono', 'Gerência (VP-4)'];
  const rows = [headers];
  const merges = [];

  const pendingByCoord = {};
  uninspected.forEach(p => {
    const key = `${p.coordenador || 'N/A'}||${p.gerencia || 'N/A'}`;
    if (!pendingByCoord[key]) {
      pendingByCoord[key] = [];
    }
    pendingByCoord[key].push(p);
  });

  const sortedCoords = Object.entries(pendingByCoord).sort((a, b) => b[1].length - a[1].length);

  let rowIdx = 1;
  sortedCoords.forEach(([key, posts]) => {
    const [coord, ger] = key.split('||');
    rows.push([`Coordenador: ${coord} (${ger})`, '', '', `Faltam ${posts.length}`]);
    merges.push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: 2 } });
    rowIdx++;

    posts.forEach(p => {
      rows.push([p.codigo, p.nome || '—', p.coordenador || '—', p.gerencia || '—']);
      rowIdx++;
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 18 }, // Código
    { wch: 35 }, // Nome do Posto
    { wch: 26 }, // Coordenador/Dono
    { wch: 30 }  // Gerência
  ];
  return ws;
}

// Planilha 2: Aderência Ativos (Acumulado)
const wsAdhAtivos = flattenHierarchyToRows(dataAcumuladoAtivos.results);
XLSX.utils.book_append_sheet(wb, wsAdhAtivos, 'Aderência Ativos (Acumulado)');

// Planilha 3: Postos Pendentes Ativos (Acumulado)
const wsPendAtivos = generateGroupedPendingSheet(dataAcumuladoAtivos.uninspected);
XLSX.utils.book_append_sheet(wb, wsPendAtivos, 'Pendentes Ativos (Acumulado)');

// Planilha 4: Aderência Ativos (Mensal)
if (dataMensalAtivos) {
  const wsAdhAtivosMensal = flattenHierarchyToRows(dataMensalAtivos.results);
  XLSX.utils.book_append_sheet(wb, wsAdhAtivosMensal, `Aderência Ativos (${recentPeriod.label.replace('/', '-')})`);
  
  const wsPendAtivosMensal = generateGroupedPendingSheet(dataMensalAtivos.uninspected);
  XLSX.utils.book_append_sheet(wb, wsPendAtivosMensal, `Pendentes Ativos (${recentPeriod.label.replace('/', '-')})`);
}

// Gravar arquivo Excel no disco
const xlsxPath = path.join(__dirname, 'Aderencia_Relatorio_Vale.xlsx');
XLSX.writeFile(wb, xlsxPath);
console.log(`Planilha XLSX criada: ${xlsxPath}`);

// 3. Gerar arquivos XLSX
function generateXLSX(filename, results) {
  const wb = XLSX.utils.book_new();
  const headers = ['Tipo', 'Gerência', 'Coordenador/Dono', 'Quantidade de Postos', 'Inspecionado', 'Aderência (%)', 'Última Inspeção', 'Status'];
  const rows = [headers];
  results.forEach((group) => {
    rows.push([
      'Gerência',
      group.name,
      '',
      group.total,
      group.inspected,
      `${group.adherence}%`,
      formatDateBR(group.lastInspectionDate),
      group.adherence === 100 ? 'Concluído' : 'Pendente'
    ]);
    group.children.forEach((child) => {
      rows.push([
        'Coordenador',
        group.name,
        child.name,
        child.total,
        child.inspected,
        `${child.adherence}%`,
        formatDateBR(child.lastInspectionDate),
        child.adherence === 100 ? 'Concluído' : 'Pendente'
      ]);
      if (child.missingPosts && child.missingPosts.length > 0) {
        child.missingPosts.forEach((post) => {
          rows.push([
            'Posto Pendente',
            group.name,
            `  ↳ ${post.code} - ${post.name}`,
            '—',
            '—',
            '0%',
            '—',
            'Faltando'
          ]);
        });
      }
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 15 }, // Tipo
    { wch: 30 }, // Gerência
    { wch: 26 }, // Coordenador/Dono
    { wch: 22 }, // Quantidade de Postos
    { wch: 15 }, // Inspecionado
    { wch: 15 }, // Aderência (%)
    { wch: 18 }, // Última Inspeção
    { wch: 15 }  // Status
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Aderência');
  const xlsxPath = path.join(__dirname, filename);
  XLSX.writeFile(wb, xlsxPath);
  console.log(`Planilha XLSX criada: ${xlsxPath}`);
}

function generatePendingXLSX(filename, uninspected) {
  const wb = XLSX.utils.book_new();
  const ws = generateGroupedPendingSheet(uninspected);
  XLSX.utils.book_append_sheet(wb, ws, 'Pendentes');
  const xlsxPath = path.join(__dirname, filename);
  XLSX.writeFile(wb, xlsxPath);
  console.log(`Planilha XLSX criada: ${xlsxPath}`);
}

generateXLSX('Aderencia_Ativos_Acumulado.xlsx', dataAcumuladoAtivos.results);
generatePendingXLSX('Postos_Pendentes_Ativos_Acumulado.xlsx', dataAcumuladoAtivos.uninspected);

if (dataMensalAtivos) {
  generateXLSX(`Aderencia_Ativos_${recentPeriod.label.replace('/', '_')}.xlsx`, dataMensalAtivos.results);
  generatePendingXLSX(`Postos_Pendentes_Ativos_${recentPeriod.label.replace('/', '_')}.xlsx`, dataMensalAtivos.uninspected);
}

console.log('\nTodos os relatórios exportados com sucesso!');
