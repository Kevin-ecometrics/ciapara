# Setup de Supabase para CiaPara

## 1. Crear el Bucket de Storage

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona **Storage** en el menú lateral
3. Clic en **New Bucket**
4. Configura:
   - **Name**: `images`
   - **Public bucket**: ✅ (marcado)
   - **Allowed MIME types**: `image/*`
   - **File size limit**: `50MB` (opcional)

## 2. Configurar Políticas RLS

Ejecuta este SQL en el SQL Editor de Supabase para permitir acceso público de lectura:

```sql
-- Política para lectura pública de imágenes
create policy "Public Read Access"
on storage.objects for select
to public
using (bucket_id = 'images');

-- Política para subida de imágenes (autenticadas o públicas según necesites)
create policy "Public Insert Access"
on storage.objects for insert
to public
with check (bucket_id = 'images');

-- Política para eliminar imágenes (autenticadas o públicas según necesites)
create policy "Public Delete Access"
on storage.objects for delete
to public
using (bucket_id = 'images');
```

## 3. Agregar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

Puedes encontrar estos valores en:
**Settings** → **API** → sección `Project API keys`

## 4. Estructura de Carpetas en Storage

Las imágenes se organizan automáticamente por orientación:

```
images/
├── horizontal/
│   ├── 1234567890-foto_paisaje.jpg
│   └── ...
├── vertical/
│   ├── 1234567891-foto_retrato.jpg
│   └── ...
└── square/
    ├── 1234567892-foto_cuadrada.jpg
    └── ...
```

## 5. Verificar Configuración

1. Inicia el servidor: `npm run dev`
2. Sube una imagen desde la página principal
3. Ve a `/play` para ver el slideshow
4. Verifica en el Dashboard de Storage que la imagen aparece
