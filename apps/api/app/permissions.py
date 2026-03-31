"""Centralized permissions configuration.

Permission format: module:feature:action
Example: transactions:manage:create, budgets:manage:update, family:members:read

Used by:
- Seed script to populate permissions in DB
- Plan configuration to assign permissions to plans
- Endpoint guards to verify access
- Admin roles to assign permissions
"""

# All possible actions
ACTIONS = ("create", "read", "update", "delete", "export", "import")

# Client-side modules and their features
CLIENT_MODULES = {
    "accounts": {
        "label": "Contas",
        "features": {
            "manage": {
                "label": "Gestão de contas",
                "actions": ["create", "read", "update", "delete"],
            },
            "transfer": {
                "label": "Transferências",
                "actions": ["create", "read"],
            },
            "summary": {
                "label": "Resumo",
                "actions": ["read"],
            },
        },
    },
    "transactions": {
        "label": "Transacções",
        "features": {
            "manage": {
                "label": "Gestão de transacções",
                "actions": ["create", "read", "update", "delete"],
            },
            "import": {
                "label": "Importação",
                "actions": ["create"],
            },
            "export": {
                "label": "Exportação",
                "actions": ["export"],
            },
        },
    },
    "budgets": {
        "label": "Orçamentos",
        "features": {
            "manage": {
                "label": "Gestão de orçamentos",
                "actions": ["create", "read", "update", "delete"],
            },
            "items": {
                "label": "Items de orçamento",
                "actions": ["create", "read", "update", "delete"],
            },
        },
    },
    "goals": {
        "label": "Metas",
        "features": {
            "manage": {
                "label": "Gestão de metas",
                "actions": ["create", "read", "update", "delete"],
            },
            "contribute": {
                "label": "Contribuições",
                "actions": ["create", "read"],
            },
        },
    },
    "debts": {
        "label": "Dívidas",
        "features": {
            "manage": {
                "label": "Gestão de dívidas",
                "actions": ["create", "read", "update", "delete"],
            },
            "payment": {
                "label": "Pagamentos",
                "actions": ["create", "read"],
            },
            "simulate": {
                "label": "Simulação",
                "actions": ["read"],
            },
        },
    },
    "investments": {
        "label": "Investimentos",
        "features": {
            "manage": {
                "label": "Gestão de investimentos",
                "actions": ["create", "read", "update", "delete"],
            },
            "analysis": {
                "label": "Análise e insights",
                "actions": ["read"],
            },
            "simulate": {
                "label": "Simulação",
                "actions": ["read"],
            },
        },
    },
    "assets": {
        "label": "Património",
        "features": {
            "manage": {
                "label": "Gestão de bens",
                "actions": ["create", "read", "update", "delete"],
            },
            "revalue": {
                "label": "Revalorização",
                "actions": ["update"],
            },
        },
    },
    "bills": {
        "label": "Contas a pagar",
        "features": {
            "manage": {
                "label": "Gestão de contas a pagar",
                "actions": ["create", "read", "update", "delete"],
            },
            "pay": {
                "label": "Pagar",
                "actions": ["create"],
            },
        },
    },
    "income_sources": {
        "label": "Fontes de rendimento",
        "features": {
            "manage": {
                "label": "Gestão de rendimentos",
                "actions": ["create", "read", "update", "delete"],
            },
        },
    },
    "recurring_rules": {
        "label": "Regras recorrentes",
        "features": {
            "manage": {
                "label": "Gestão de recorrentes",
                "actions": ["create", "read", "update", "delete"],
            },
        },
    },
    "reports": {
        "label": "Relatórios",
        "features": {
            "basic": {
                "label": "Relatórios básicos",
                "actions": ["read"],
            },
            "advanced": {
                "label": "Relatórios avançados",
                "actions": ["read", "export"],
            },
            "patrimony": {
                "label": "Património",
                "actions": ["read"],
            },
        },
    },
    "ai": {
        "label": "Assistente IA",
        "features": {
            "chat": {
                "label": "Chat",
                "actions": ["create", "read"],
            },
            "ocr": {
                "label": "OCR de recibos",
                "actions": ["create"],
            },
            "voice": {
                "label": "Comandos de voz",
                "actions": ["create"],
            },
            "insights": {
                "label": "Insights automáticos",
                "actions": ["read"],
            },
        },
    },
    "family": {
        "label": "Família",
        "features": {
            "manage": {
                "label": "Gestão familiar",
                "actions": ["create", "read", "update", "delete"],
            },
            "members": {
                "label": "Membros",
                "actions": ["create", "read", "update", "delete"],
            },
            "expense_splits": {
                "label": "Divisão de despesas",
                "actions": ["create", "read", "update", "delete"],
            },
        },
    },
    "education": {
        "label": "Educação financeira",
        "features": {
            "view": {
                "label": "Visualizar",
                "actions": ["read"],
            },
            "challenges": {
                "label": "Desafios",
                "actions": ["create", "read"],
            },
        },
    },
    "news": {
        "label": "Notícias financeiras",
        "features": {
            "view": {
                "label": "Visualizar",
                "actions": ["read"],
            },
            "ask": {
                "label": "Perguntar à IA",
                "actions": ["create"],
            },
        },
    },
    "notifications": {
        "label": "Notificações",
        "features": {
            "manage": {
                "label": "Gestão",
                "actions": ["read", "update"],
            },
        },
    },
    "settings": {
        "label": "Configurações",
        "features": {
            "profile": {
                "label": "Perfil",
                "actions": ["read", "update"],
            },
            "tags": {
                "label": "Etiquetas",
                "actions": ["create", "read", "delete"],
            },
            "billing": {
                "label": "Subscrição e planos",
                "actions": ["read", "update"],
            },
        },
    },
}

# Admin-side modules
ADMIN_MODULES = {
    "admin_users": {
        "label": "Gestão de utilizadores",
        "features": {
            "manage": {
                "label": "Utilizadores",
                "actions": ["create", "read", "update", "delete"],
            },
            "subscriptions": {
                "label": "Subscrições",
                "actions": ["read", "update"],
            },
        },
    },
    "admin_billing": {
        "label": "Gestão de billing",
        "features": {
            "plans": {
                "label": "Planos",
                "actions": ["create", "read", "update", "delete"],
            },
            "promotions": {
                "label": "Promoções",
                "actions": ["create", "read", "update", "delete"],
            },
            "addons": {
                "label": "Add-ons",
                "actions": ["create", "read", "update", "delete"],
            },
        },
    },
    "admin_platform": {
        "label": "Gestão da plataforma",
        "features": {
            "settings": {
                "label": "Configurações",
                "actions": ["read", "update"],
            },
            "analytics": {
                "label": "Analytics",
                "actions": ["read"],
            },
            "logs": {
                "label": "Logs",
                "actions": ["read"],
            },
        },
    },
}


# ---------------------------------------------------------------------------
# Permission generators
# ---------------------------------------------------------------------------


def _generate_from_modules(modules: dict) -> list[str]:
    """Generate permission strings from a modules dict."""
    perms = []
    for module_key, module in modules.items():
        for feature_key, feature in module["features"].items():
            for action in feature["actions"]:
                perms.append(f"{module_key}:{feature_key}:{action}")
    return sorted(perms)


def generate_all_permissions() -> list[str]:
    """Generate ALL possible permission strings from the config."""
    client = _generate_from_modules(CLIENT_MODULES)
    admin = _generate_from_modules(ADMIN_MODULES)
    return sorted(client + admin)


def generate_client_permissions() -> list[str]:
    """Generate client-side permissions only."""
    return _generate_from_modules(CLIENT_MODULES)


def generate_admin_permissions() -> list[str]:
    """Generate admin-side permissions only."""
    return _generate_from_modules(ADMIN_MODULES)


def get_permission_label(code: str) -> str:
    """Get a human-readable label for a permission code.

    Example: "transactions:manage:create" -> "Transacções > Gestão de transacções > create"
    """
    parts = code.split(":")
    if len(parts) != 3:
        return code

    module_key, feature_key, action = parts
    all_modules = {**CLIENT_MODULES, **ADMIN_MODULES}

    module = all_modules.get(module_key)
    if not module:
        return code

    feature = module["features"].get(feature_key)
    if not feature:
        return code

    action_labels = {
        "create": "Criar",
        "read": "Ver",
        "update": "Editar",
        "delete": "Eliminar",
        "export": "Exportar",
        "import": "Importar",
    }
    action_label = action_labels.get(action, action)

    return f"{module['label']} > {feature['label']} > {action_label}"


def is_client_permission(code: str) -> bool:
    """Check if a permission code is client-side."""
    module_key = code.split(":")[0]
    return module_key in CLIENT_MODULES


# ---------------------------------------------------------------------------
# Default permissions per plan type
# ---------------------------------------------------------------------------

PERSONAL_PLAN_PERMISSIONS = [
    p
    for p in generate_client_permissions()
    if not p.startswith("family:")  # Personal plan has everything except family
]

FAMILY_PLAN_PERMISSIONS = generate_client_permissions()  # Family plan has everything


def get_plan_permissions(plan_type: str) -> list[str]:
    """Get default permissions for a plan type."""
    if plan_type == "family":
        return FAMILY_PLAN_PERMISSIONS
    return PERSONAL_PLAN_PERMISSIONS
