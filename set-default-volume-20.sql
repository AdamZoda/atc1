-- Définir le volume par défaut à 20%
UPDATE site_music 
SET volume = 20
WHERE music_name != 'Aucune musique';

-- Vérifier
SELECT id, music_name, music_url, is_playing, volume 
FROM site_music;
