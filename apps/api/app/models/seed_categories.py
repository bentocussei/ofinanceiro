"""Seed data: 60+ system categories for Angola."""

SYSTEM_CATEGORIES: list[dict] = [
    # ===== DESPESAS - Categorias principais =====
    {"slug": "alimentacao", "name": "Alimentação", "icon": "🍽️", "type": "expense", "sort": 1, "children": [
        {"slug": "alimentacao-supermercado", "name": "Supermercado", "sort": 1},
        {"slug": "alimentacao-mercado", "name": "Mercado informal", "sort": 2},
        {"slug": "alimentacao-restaurante", "name": "Restaurante", "sort": 3},
        {"slug": "alimentacao-takeaway", "name": "Take-away / Delivery", "sort": 4},
        {"slug": "alimentacao-padaria", "name": "Padaria", "sort": 5},
        {"slug": "alimentacao-bebidas", "name": "Bebidas", "sort": 6},
    ]},
    {"slug": "casa", "name": "Casa", "icon": "🏠", "type": "expense", "sort": 2, "children": [
        {"slug": "casa-renda", "name": "Renda / Prestação", "sort": 1},
        {"slug": "casa-condominio", "name": "Condomínio", "sort": 2},
        {"slug": "casa-agua", "name": "Água (EPAL)", "sort": 3},
        {"slug": "casa-electricidade", "name": "Electricidade (ENDE/EDEL)", "sort": 4},
        {"slug": "casa-gas", "name": "Gás", "sort": 5},
        {"slug": "casa-internet", "name": "Internet", "sort": 6},
        {"slug": "casa-empregada", "name": "Empregada doméstica", "sort": 7},
        {"slug": "casa-manutencao", "name": "Manutenção / Reparações", "sort": 8},
        {"slug": "casa-mobiliario", "name": "Mobiliário e decoração", "sort": 9},
        {"slug": "casa-limpeza", "name": "Produtos de limpeza", "sort": 10},
    ]},
    {"slug": "transporte", "name": "Transporte", "icon": "🚗", "type": "expense", "sort": 3, "children": [
        {"slug": "transporte-combustivel", "name": "Gasóleo / Gasolina", "sort": 1},
        {"slug": "transporte-candongueiro", "name": "Candongueiro / Kupapata", "sort": 2},
        {"slug": "transporte-taxi", "name": "Táxi / HEETCH / Kubinga", "sort": 3},
        {"slug": "transporte-manutencao", "name": "Manutenção automóvel", "sort": 4},
        {"slug": "transporte-seguro", "name": "Seguro automóvel", "sort": 5},
        {"slug": "transporte-estacionamento", "name": "Estacionamento", "sort": 6},
        {"slug": "transporte-lavagem", "name": "Lavagem automóvel", "sort": 7},
    ]},
    {"slug": "filhos", "name": "Filhos", "icon": "👶", "type": "expense", "sort": 4, "children": [
        {"slug": "filhos-propina", "name": "Propina escolar", "sort": 1},
        {"slug": "filhos-material", "name": "Material escolar", "sort": 2},
        {"slug": "filhos-uniforme", "name": "Uniforme", "sort": 3},
        {"slug": "filhos-actividades", "name": "Actividades extra", "sort": 4},
        {"slug": "filhos-mesada", "name": "Mesada", "sort": 5},
        {"slug": "filhos-roupa", "name": "Roupa (filhos)", "sort": 6},
        {"slug": "filhos-saude", "name": "Saúde (filhos)", "sort": 7},
        {"slug": "filhos-lazer", "name": "Brinquedos / Lazer", "sort": 8},
    ]},
    {"slug": "saude", "name": "Saúde", "icon": "💊", "type": "expense", "sort": 5, "children": [
        {"slug": "saude-consulta", "name": "Consulta médica", "sort": 1},
        {"slug": "saude-medicamentos", "name": "Medicamentos", "sort": 2},
        {"slug": "saude-analises", "name": "Análises / Exames", "sort": 3},
        {"slug": "saude-seguro", "name": "Seguro de saúde", "sort": 4},
        {"slug": "saude-dentista", "name": "Dentista", "sort": 5},
        {"slug": "saude-optica", "name": "Óptica", "sort": 6},
    ]},
    {"slug": "pessoal", "name": "Pessoal", "icon": "👔", "type": "expense", "sort": 6, "children": [
        {"slug": "pessoal-roupa", "name": "Roupa e calçado", "sort": 1},
        {"slug": "pessoal-higiene", "name": "Higiene pessoal", "sort": 2},
        {"slug": "pessoal-cabeleireiro", "name": "Cabeleireiro / Barbeiro", "sort": 3},
    ]},
    {"slug": "lazer", "name": "Lazer", "icon": "🎉", "type": "expense", "sort": 7, "children": [
        {"slug": "lazer-cinema", "name": "Cinema / Entretenimento", "sort": 1},
        {"slug": "lazer-viagem", "name": "Viagens", "sort": 2},
        {"slug": "lazer-streaming", "name": "Streaming (Netflix, etc.)", "sort": 3},
        {"slug": "lazer-ginasio", "name": "Ginásio", "sort": 4},
        {"slug": "lazer-eventos", "name": "Eventos / Festas", "sort": 5},
    ]},
    {"slug": "comunicacoes", "name": "Comunicações", "icon": "📱", "type": "expense", "sort": 8, "children": [
        {"slug": "comunicacoes-recarga", "name": "Recarga Unitel / Movicel", "sort": 1},
        {"slug": "comunicacoes-internet-movel", "name": "Internet móvel", "sort": 2},
        {"slug": "comunicacoes-telefone", "name": "Telefone fixo", "sort": 3},
    ]},
    {"slug": "educacao", "name": "Educação", "icon": "🎓", "type": "expense", "sort": 9, "children": [
        {"slug": "educacao-curso", "name": "Curso / Formação", "sort": 1},
        {"slug": "educacao-livros", "name": "Livros", "sort": 2},
    ]},
    {"slug": "transferencias", "name": "Transferências", "icon": "💸", "type": "expense", "sort": 10, "children": [
        {"slug": "transferencias-familia", "name": "Transferência para família", "sort": 1},
        {"slug": "transferencias-ajuda", "name": "Ajuda financeira", "sort": 2},
        {"slug": "transferencias-kixikila", "name": "Kixikila (contribuição)", "sort": 3},
        {"slug": "transferencias-dizimo", "name": "Dízimo / Igreja", "sort": 4},
        {"slug": "transferencias-presente", "name": "Presentes", "sort": 5},
    ]},
    {"slug": "impostos", "name": "Impostos e Governo", "icon": "📋", "type": "expense", "sort": 11, "children": [
        {"slug": "impostos-irt", "name": "IRT", "sort": 1},
        {"slug": "impostos-inss", "name": "INSS", "sort": 2},
        {"slug": "impostos-predial", "name": "Imposto predial", "sort": 3},
        {"slug": "impostos-notario", "name": "Notário / Documentos", "sort": 4},
    ]},
    {"slug": "financeiro", "name": "Financeiro", "icon": "🏦", "type": "expense", "sort": 12, "children": [
        {"slug": "financeiro-comissao", "name": "Comissão bancária", "sort": 1},
        {"slug": "financeiro-juros", "name": "Juros pagos", "sort": 2},
        {"slug": "financeiro-multicaixa", "name": "Taxa Multicaixa Express", "sort": 3},
    ]},
    {"slug": "outros-despesa", "name": "Outros", "icon": "📦", "type": "expense", "sort": 13, "children": []},

    # ===== RECEITAS =====
    {"slug": "receitas", "name": "Receitas", "icon": "💵", "type": "income", "sort": 20, "children": [
        {"slug": "receitas-salario", "name": "Salário", "sort": 1},
        {"slug": "receitas-extra", "name": "Rendimento extra", "sort": 2},
        {"slug": "receitas-freelance", "name": "Freelance", "sort": 3},
        {"slug": "receitas-vendas", "name": "Vendas", "sort": 4},
        {"slug": "receitas-rendas", "name": "Rendas recebidas", "sort": 5},
        {"slug": "receitas-juros", "name": "Juros / Rendimentos", "sort": 6},
        {"slug": "receitas-presentes", "name": "Presentes recebidos", "sort": 7},
        {"slug": "receitas-kixikila", "name": "Kixikila (recebimento)", "sort": 8},
    ]},
]
