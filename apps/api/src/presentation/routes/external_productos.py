import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.producto_service import ProductoService
from src.core.dependencies import CurrentExternalClient, get_current_api_key
from src.domain.producto import ActualizarProductoRequest, CrearProductoRequest, ProductoResponse
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/external/v1/productos", tags=["external"])


@router.get("", response_model=list[ProductoResponse])
def listar_productos(
    search: str | None = None,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    productos = ProductoService(db).listar(client.empresa_id, search=search)
    return [ProductoResponse.from_model(p) for p in productos]


@router.get("/{producto_id}", response_model=ProductoResponse)
def obtener_producto(
    producto_id: uuid.UUID,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    producto = ProductoService(db).obtener(client.empresa_id, producto_id)
    return ProductoResponse.from_model(producto)


@router.post("", response_model=ProductoResponse, status_code=201)
def crear_producto(
    body: CrearProductoRequest,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    producto = ProductoService(db).crear(client.empresa_id, body)
    return ProductoResponse.from_model(producto)


@router.patch("/{producto_id}", response_model=ProductoResponse)
def actualizar_producto(
    producto_id: uuid.UUID,
    body: ActualizarProductoRequest,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    producto = ProductoService(db).actualizar(client.empresa_id, producto_id, body)
    return ProductoResponse.from_model(producto)


@router.delete("/{producto_id}", status_code=204)
def eliminar_producto(
    producto_id: uuid.UUID,
    db: Session = Depends(get_db),
    client: CurrentExternalClient = Depends(get_current_api_key),
):
    ProductoService(db).eliminar(client.empresa_id, producto_id)
