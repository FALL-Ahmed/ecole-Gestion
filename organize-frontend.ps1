# organize-frontend.ps1

# --- Début du Script ---

# Affiche un message de départ
Write-Host "Début de la réorganisation du projet..." -ForegroundColor Green

# 1. Vérifie si le dossier 'frontend' existe déjà
if (Test-Path -Path "./frontend" -PathType Container) {
    Write-Host "Le dossier 'frontend' existe déjà. Le script va s'arrêter pour éviter d'écraser des fichiers." -ForegroundColor Red
    exit
}

# 2. Crée le nouveau dossier 'frontend'
Write-Host "Création du dossier 'frontend'..."
New-Item -ItemType Directory -Path "./frontend"

# 3. Liste des fichiers et dossiers à déplacer
$itemsToMove = @(
    "src",
    "public",
    "package.json",
    "package-lock.json",
    "vite.config.ts",
    "tailwind.config.ts",
    "postcss.config.js",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
"components.json",
    "index.html")

# 4. Déplace chaque élément dans le dossier 'frontend'
foreach ($item in $itemsToMove) {
    if (Test-Path -Path "./$item") {
        Write-Host "Déplacement de '$item' vers 'frontend/'..."
        Move-Item -Path "./$item" -Destination "./frontend"
    } else {
        Write-Host "L'élément '$item' n'a pas été trouvé, il est ignoré." -ForegroundColor Yellow
    }
}

Write-Host "Réorganisation terminée avec succès !" -ForegroundColor Green
Write-Host "N'oubliez pas de faire 'cd frontend' puis 'npm install' pour mettre à jour vos dépendances." -ForegroundColor Cyan

# --- Fin du Script ---
