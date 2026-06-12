"""Knowledge Base CRUD router."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import KnowledgeArticle
from schemas import KnowledgeCreate, KnowledgeUpdate, KnowledgeOut, MsgResponse

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("", response_model=list[KnowledgeOut])
def list_articles(
    search: str = "",
    category: str = "",
    db: Session = Depends(get_db),
):
    q = db.query(KnowledgeArticle).order_by(KnowledgeArticle.updated_at.desc())
    if search:
        kw = f"%{search}%"
        q = q.filter(
            (KnowledgeArticle.title.ilike(kw)) |
            (KnowledgeArticle.content.ilike(kw)) |
            (KnowledgeArticle.tags.ilike(kw))
        )
    if category:
        q = q.filter(KnowledgeArticle.category == category)
    return q.all()


@router.get("/{aid}", response_model=KnowledgeOut)
def get_article(aid: int, db: Session = Depends(get_db)):
    a = db.query(KnowledgeArticle).get(aid)
    if not a:
        raise HTTPException(404, "文章不存在")
    a.view_count += 1
    db.commit()
    return a


@router.post("", response_model=KnowledgeOut)
def create_article(body: KnowledgeCreate, db: Session = Depends(get_db)):
    a = KnowledgeArticle(**body.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.put("/{aid}", response_model=KnowledgeOut)
def update_article(aid: int, body: KnowledgeUpdate, db: Session = Depends(get_db)):
    a = db.query(KnowledgeArticle).get(aid)
    if not a:
        raise HTTPException(404, "文章不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{aid}", response_model=MsgResponse)
def delete_article(aid: int, db: Session = Depends(get_db)):
    a = db.query(KnowledgeArticle).get(aid)
    if not a:
        raise HTTPException(404, "文章不存在")
    db.delete(a)
    db.commit()
    return {"ok": True, "message": "已删除"}


@router.get("/categories/list", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(KnowledgeArticle.category).distinct().all()
    return sorted([c[0] for c in cats if c[0]])
