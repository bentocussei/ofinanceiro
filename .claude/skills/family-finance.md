---
description: Implement family financial management features
globs: ["**/family*", "**/household*", "**/member*"]
---

# Family Financial Management

Family management is a CORE pillar of O Financeiro, not an add-on. See `docs/02_MODULOS_FUNCIONALIDADES.md` Module 5 (FIN.FAM).

## Key Concepts

### Family Aggregate
- A family is a group of users managing finances together
- One admin (creator) + members (adults and dependents)
- Each family has its own shared accounts and household budget

### Roles
- **Admin**: Full control, manages members, sees everything
- **Adulto**: Can add transactions, see shared data, limited management
- **Dependente**: View-only or restricted (children, elderly)

### Privacy Model
- **Shared accounts**: Visible to all authorized members
- **Individual accounts**: Only visible to the owner
- **Private transactions**: Hidden from family view (e.g., surprise gifts)
- **"Necessita Revisão" flag**: For transactions that need partner approval

### Contribution Models
- 50/50: Equal split
- Proportional: Based on each member's income
- Fixed amount: Each contributes a set amount
- Custom: Flexible per-category splits

## Data Architecture

```
families
├── id, name, created_by
├── family_members (user_id, family_id, role, permissions)
├── accounts (family accounts, shared visibility)
├── budgets (household budget, separate from personal)
└── goals (family savings goals with per-member contributions)
```

## Per-Child Expense Tracking

Critical for Angolan families where school fees, uniforms, and activities per child are major expenses.

```
- Track expenses per dependent (child)
- Categories: propina, material escolar, uniforme, saúde, roupa, mesada, actividades
- Monthly summary per child
- Year-over-year comparison
```

## API Patterns

- All family endpoints require membership verification
- Admin-only endpoints: add/remove members, change roles, delete family
- Member endpoints: add transactions to shared accounts, view summaries
- Never expose one member's private data to another
- Family invitation: via phone number or invite code

## Key Rules

- Permissions check on EVERY family query (not just auth, but family membership + role)
- Respect privacy settings rigorously — this is sensitive data
- Household budget is SEPARATE from individual budgets
- Family notifications: "Membro X adicionou despesa de 50.000 Kz"
- Offline sync must handle family data carefully (conflict resolution)
