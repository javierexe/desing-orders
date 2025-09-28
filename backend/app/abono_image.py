import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), '../uploads/comprobantes')
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter()

@router.post("/upload-abono-image")
def upload_abono_image(file: UploadFile = File(...)):
    # Validar tipo de archivo
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes")
    # Limitar tamaño (ejemplo: 2MB)
    contents = file.file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Imagen demasiado grande (máx 2MB)")
    # Guardar archivo
    filename = file.filename.replace(" ", "_")
    path = os.path.join(UPLOAD_DIR, filename)
    with open(path, "wb") as f:
        f.write(contents)
    # Retornar URL relativa
    return {"url": f"/uploads/comprobantes/{filename}"}

@router.get("/uploads/comprobantes/{filename}")
def get_abono_image(filename: str):
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    return FileResponse(path)
