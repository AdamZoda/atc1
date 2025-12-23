#!/bin/bash

# Script de vérification de la configuration Atlantic RP
# Usage: ./check-config.sh

echo "🔍 Vérification de la configuration Atlantic RP..."
echo ""

# Vérifier .env.local
if [ -f ".env.local" ]; then
    echo "✅ Fichier .env.local trouvé"
    
    # Vérifier les variables
    if grep -q "VITE_SUPABASE_URL" .env.local; then
        echo "  ✅ VITE_SUPABASE_URL configuré"
    else
        echo "  ❌ VITE_SUPABASE_URL manquant"
    fi
    
    if grep -q "VITE_SUPABASE_ANON_KEY" .env.local; then
        echo "  ✅ VITE_SUPABASE_ANON_KEY configuré"
    else
        echo "  ❌ VITE_SUPABASE_ANON_KEY manquant"
    fi
else
    echo "❌ Fichier .env.local non trouvé"
    echo "   Créez-le : cp .env.example .env.local"
fi

echo ""

# Vérifier node_modules
if [ -d "node_modules" ]; then
    echo "✅ node_modules installés"
else
    echo "❌ node_modules manquant"
    echo "   Installez : npm install"
fi

echo ""

# Vérifier .gitignore
if grep -q "\.env\.local" .gitignore; then
    echo "✅ .env.local est dans .gitignore"
else
    echo "⚠️  .env.local n'est pas dans .gitignore (DANGER!)"
fi

echo ""
echo "✨ Vérification terminée!"
