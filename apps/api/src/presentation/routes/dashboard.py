from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.application.dashboard_service import DashboardService
from src.core.dependencies import CurrentAdmin, get_current_admin
from src.domain.dashboard import DashboardKpisResponse
from src.infrastructure.db.session import get_db

router = APIRouter(prefix="/api/v1/admin/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardKpisResponse)
def obtener_kpis(
    db: Session = Depends(get_db),
    _admin: CurrentAdmin = Depends(get_current_admin),
):
    return DashboardService(db).obtener_kpis()
