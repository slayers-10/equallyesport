# Equally Esport — Site Web Officiel

Site web professionnel de l'organisation esport **Equally Esport**.
Développé en HTML5, CSS3, JavaScript vanilla et JSON.

## 🚀 Lancement rapide

```bash
# Avec VS Code Live Server (recommandé)
# Clic droit sur index.html → "Open with Live Server"

# Avec Python (simple)
python3 -m http.server 8080

# Avec Node.js
npx serve .
```

> ⚠️ Le site doit être servi via un serveur HTTP (pas en `file://`)
> car il charge les fichiers JSON via `fetch()`.

## 📁 Structure du projet

```
equally-esport/
├── index.html              ← Page principale
├── css/
│   ├── variables.css       ← Tokens de design (couleurs, typo, spacing)
│   ├── reset.css           ← Reset CSS + scrollbar custom
│   ├── components.css      ← Composants (navbar, cards, boutons, glitch…)
│   └── main.css            ← Layout sections + responsive
├── js/
│   ├── particles.js        ← Animation canvas particules rouges
│   ├── counter.js          ← Compteurs animés (scroll triggered)
│   ├── loader.js           ← Chargement + injection des données JSON
│   └── main.js             ← Init globale, navbar, form, palmarès
├── data/
│   ├── teams.json          ← Équipes et rosters
│   ├── results.json        ← Derniers résultats de matchs
│   ├── news.json           ← Actualités
│   └── partners.json       ← Partenaires / sponsors
├── assets/
│   ├── logo/               ← Logo (SVG recommandé)
│   ├── images/             ← Images joueurs, actualités, partenaires
│   └── icons/              ← Icônes SVG jeux
└── README.md
```

## 🎨 Charte graphique

| Token       | Valeur    | Usage                         |
|-------------|-----------|-------------------------------|
| `--color-bg`     | `#080808` | Fond principal               |
| `--color-bg-2`   | `#111111` | Sections alternées           |
| `--color-bg-3`   | `#1A0000` | Cards, accents sombres       |
| `--color-red`    | `#E5000A` | Couleur signature             |
| `--color-red-hover` | `#FF2D35` | Hover, glow               |
| `--color-red-dark` | `#8B0000` | Bordures, accents sombres  |

**Typographies :**
- Display : `Barlow Condensed` Bold Italic
- Corps : `Inter`
- Mono/Stats : `JetBrains Mono`

## 📦 Personnalisation des données

### Ajouter une équipe (`data/teams.json`)
```json
{
  "id": "game-01",
  "game": "Nom du jeu",
  "gameIcon": "TAG",
  "gameColor": "#COULEUR",
  "teamName": "Equally NomEquipe",
  "players": [
    { "pseudo": "Pseudo", "role": "Rôle" }
  ]
}
```

### Ajouter un résultat (`data/results.json`)
```json
{
  "id": "r009",
  "game": "Valorant",
  "opponent": "Nom adversaire",
  "scoreUs": 13,
  "scoreThem": 8,
  "tournament": "Nom du tournoi",
  "date": "2025-06-15",
  "result": "win"
}
```

### Ajouter une actualité (`data/news.json`)
```json
{
  "id": "n007",
  "title": "Titre de l'actu",
  "category": "Victoire",
  "date": "2025-06-15",
  "summary": "Résumé court...",
  "image": null
}
```

### Catégories disponibles
`Victoire` | `Transfert` | `Qualification` | `Partenariat` | `Analyse`

## ✅ Features

- [x] Loader animé rouge
- [x] Navbar sticky avec blur + burger mobile
- [x] Hero avec canvas particules animées
- [x] Effet glitch sur le titre
- [x] Compteurs animés (scroll triggered)
- [x] Section équipes avec filtres dynamiques
- [x] Tableau résultats chargé depuis JSON
- [x] Grille actualités avec cards
- [x] Palmarès avec scroll reveal gauche/droite
- [x] Section recrutement avec postes + formulaire validé
- [x] Section partenaires avec tiers + marquee Bronze
- [x] Footer complet avec réseaux sociaux SVG
- [x] Responsive mobile-first complet
- [x] `prefers-reduced-motion` respecté
- [x] HTML sémantique + ARIA

## 🔧 Technologies

- HTML5 sémantique
- CSS3 (variables, clip-path, animations, grid, flexbox)
- JavaScript vanilla (ES6+, fetch, IntersectionObserver, canvas API)
- JSON (données dynamiques)
- Google Fonts (Barlow Condensed, Inter, JetBrains Mono)

## 📝 Crédits

Développé pour **Equally Esport** — 2025
