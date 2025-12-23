# 📚 Bonnes Pratiques - Upload & Géolocalisation

## 🎯 Principes Clés

### 1. **Feedback Immédiat**
✅ **Toujours** montrer un preview avant d'envoyer
✅ **Toujours** avoir un loading state pendant l'opération
✅ **Toujours** afficher un message de succès/erreur

❌ **NE PAS** attendre le serveur avant de montrer quelque chose
❌ **NE PAS** laisser l'utilisateur dans l'incertitude

### 2. **Auto-Save Intelligent**
✅ Sauvegarder automatiquement quand possible
✅ Réduire le nombre de clics utilisateur
✅ Garder la simplicité

❌ **NE PAS** forcer l'utilisateur à cliquer "Save" partout

### 3. **Sécurité des Données**
✅ Masquer les infos sensibles
✅ Garder les données backend confidentielles
✅ Valider côté serveur toujours

❌ **NE PAS** afficher les coordonnées GPS de l'utilisateur
❌ **NE PAS** exposer d'infos de localisation précises

### 4. **Design Responsive**
✅ Tester sur mobile, tablet, desktop
✅ Adapter les layouts selon l'écran
✅ Garder l'accessibilité prioritaire

❌ **NE PAS** ignorer les petits écrans

---

## 💾 Pattern: Upload de Fichier

### Étapes Recommandées

```tsx
// 1. State pour preview + upload
const [preview, setPreview] = useState('');
const [uploading, setUploading] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);

// 2. Handler avec preview immédiat
const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // 2a. Preview immédiat (FileReader)
  const reader = new FileReader();
  reader.onload = (event) => {
    setPreview(event.target?.result as string);
  };
  reader.readAsDataURL(file);

  // 2b. Upload asynchrone
  setUploading(true);
  try {
    // Valider fichier
    if (!isValidFile(file)) throw new Error('Fichier invalide');
    
    // Upload (Supabase, CloudFlare, etc)
    const url = await uploadFile(file);
    
    // Auto-save en DB
    await saveToDatabase(url);
    
    // Success message
    setMessage('✓ Uploaded');
  } catch (err) {
    // Error handling
    setMessage('✗ Error: ' + err.message);
    setPreview(previousValue); // Reset preview
  } finally {
    setUploading(false);
    fileInputRef.current.value = ''; // Clear input
  }
};

// 3. UI
return (
  <>
    <img src={preview || currentValue} /> {/* Preview or current */}
    <input ref={fileInputRef} type="file" onChange={handleFileSelect} hidden />
    <button onClick={() => fileInputRef.current?.click()}>
      Upload
    </button>
  </>
);
```

### Validation de Fichier

```tsx
function isValidFile(file: File): boolean {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
  
  if (file.size > MAX_SIZE) {
    throw new Error('Fichier trop gros (max 5MB)');
  }
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Type de fichier non autorisé');
  }
  
  return true;
}
```

---

## 📍 Pattern: Géolocalisation

### Étapes Recommandées

```tsx
// 1. État
const [location, setLocation] = useState<{lat: number, lon: number} | null>(null);
const [requesting, setRequesting] = useState(false);

// 2. Demander position
const requestLocation = async () => {
  if (!navigator.geolocation) {
    throw new Error('Géolocalisation non supportée');
  }

  setRequesting(true);
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      
      // Valider coordonnées
      if (!isValidCoordinates(latitude, longitude)) {
        throw new Error('Coordonnées invalides');
      }
      
      // Sauvegarder
      await saveLocation(latitude, longitude);
      
      // Mettre à jour state
      setLocation({ lat: latitude, lon: longitude });
      setMessage('✓ Position sauvegardée');
    },
    (error) => {
      // Gestion erreurs
      const message = mapGeolocationError(error.code);
      setMessage('✗ ' + message);
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
  
  setRequesting(false);
};

// 3. Mapper les erreurs
function mapGeolocationError(code: number): string {
  switch(code) {
    case 1: return 'Permission refusée';
    case 2: return 'Position indisponible';
    case 3: return 'Timeout';
    default: return 'Erreur inconnue';
  }
}

// 4. Valider coordonnées
function isValidCoordinates(lat: number, lon: number): boolean {
  return (
    lat >= -90 && lat <= 90 &&
    lon >= -180 && lon <= 180 &&
    !isNaN(lat) && !isNaN(lon)
  );
}
```

---

## 🔐 Sécurité: Données Sensibles

### ❌ À NE PAS FAIRE

```tsx
// Mauvais: Coordonnées visibles
<div>
  Votre position: {latitude}, {longitude}
</div>

// Mauvais: Info sensible en localStorage
localStorage.setItem('userLocation', JSON.stringify({lat, lon}));

// Mauvais: Pas de validation
const {latitude, longitude} = position.coords; // Direct use!
```

### ✅ À FAIRE

```tsx
// Bon: Coordonnées cachées, lien seulement
<a href={`https://maps.google.com?q=${lat},${lon}`}>
  Voir sur Google Maps
</a>

// Bon: Stocker en DB sécurisée
const { error } = await supabase
  .from('profiles')
  .update({latitude, longitude})
  .eq('id', userId);

// Bon: Validation avant
if (!isValidCoordinates(lat, lon)) {
  throw new Error('Invalid coordinates');
}

// Bon: AccessControl - Admin seulement
if (user.role !== 'admin') {
  return <div>Pas d'accès</div>;
}
```

---

## 🎨 Pattern: Messages d'État

### Implémentation Recommandée

```tsx
type MessageType = 'success' | 'error' | 'info';

const [message, setMessage] = useState<{text: string, type: MessageType} | null>(null);

// Afficher message
const showMessage = (text: string, type: MessageType = 'info') => {
  setMessage({text, type});
  // Auto-hide après 5 secondes
  setTimeout(() => setMessage(null), 5000);
};

// UI
{message && (
  <div className={`
    p-4 rounded-lg mb-4
    ${message.type === 'success' && 'bg-green-500/10 text-green-300'}
    ${message.type === 'error' && 'bg-red-500/10 text-red-300'}
    ${message.type === 'info' && 'bg-blue-500/10 text-blue-300'}
  `}>
    {message.text}
  </div>
)}
```

---

## 📱 Pattern: Responsive Upload

### Desktop vs Mobile

```tsx
// Desktop: Côte à côte
<div className="flex gap-8 items-center">
  <img className="w-32 h-32" /> {/* Grand preview */}
  <div>
    <button>Upload</button>
  </div>
</div>

// Mobile: Empilé
<div className="md:flex gap-8 items-center">
  <img className="w-20 h-20 md:w-32 md:h-32" /> {/* Adaptatif */}
  <div className="w-full">
    <button className="w-full">Upload</button> {/* Full width */}
  </div>
</div>
```

---

## 🧪 Tests Essentiels

### Avant de déployer

```tsx
// Test 1: Preview fonctionne
expect(preview).toBeVisible();

// Test 2: Upload complète
await waitFor(() => expect(message).toBe('✓ Success'));

// Test 3: Data persiste
const saved = await fetchFromDB();
expect(saved.url).toBe(uploadedUrl);

// Test 4: Erreur gérée
try { await upload(invalidFile); } 
catch { expect(message).toContain('Error'); }

// Test 5: Sécurité OK
expect(componentHTML).not.toContain('coordinates');
```

---

## 📋 Checklist pour Chaque Feature

- [ ] Preview/feedback immédiat
- [ ] Loading state pendant l'opération
- [ ] Message de succès cllair
- [ ] Gestion d'erreurs complète
- [ ] Validation côté client ET serveur
- [ ] Données sensibles masquées
- [ ] Responsive sur tous les écrans
- [ ] Accessible (keyboard, screen reader)
- [ ] Tests unitaires
- [ ] Tests d'intégration

---

## 🚀 Optimisations Performance

### Upload Optimization

```tsx
// Compression avant upload (images)
const compressImage = async (file: File): Promise<Blob> => {
  const canvas = await createImageBitmap(file);
  // Redimensionner, compresser, retourner Blob
};

// Progressive loading
const uploadWithProgress = (file: File, onProgress: (percent: number) => void) => {
  // Utiliser XMLHttpRequest avec addEventListener('progress')
};

// Cache local
const cacheAvatar = (url: string) => {
  localStorage.setItem('lastAvatarUrl', url);
};
```

---

## 📚 Ressources Utiles

- [MDN: FileReader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader)
- [MDN: Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Web.dev: Image Optimization](https://web.dev/image-optimization/)
- [Supabase: Storage](https://supabase.com/docs/guides/storage)
