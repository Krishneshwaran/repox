from __future__ import annotations

from pathlib import Path


class RepoEmbeddingsStore:
    def __init__(self, workspace: Path) -> None:
        self._enabled = True
        try:
            import chromadb

            db_path = workspace / ".ai_memory"
            db_path.mkdir(parents=True, exist_ok=True)
            self._client = chromadb.PersistentClient(path=str(db_path))
            self._collection = self._client.get_or_create_collection("repo_notes")
            from sentence_transformers import SentenceTransformer

            self._encoder = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception:
            self._enabled = False

    def upsert_notes(self, repo_name: str, notes: dict[str, str]) -> None:
        if not self._enabled or not notes:
            return
        ids: list[str] = []
        documents: list[str] = []
        metas: list[dict[str, str]] = []
        for key, text in notes.items():
            ids.append(f"{repo_name}:{key}")
            documents.append(text)
            metas.append({"repo": repo_name, "kind": key})

        embeddings = self._encoder.encode(documents).tolist()
        self._collection.upsert(ids=ids, embeddings=embeddings, documents=documents, metadatas=metas)

    def query_notes(self, repo_name: str, question: str, limit: int = 4) -> str:
        if not self._enabled:
            return ""
        query_vec = self._encoder.encode([question]).tolist()
        result = self._collection.query(
            query_embeddings=query_vec,
            n_results=limit,
            where={"repo": repo_name},
        )
        docs = (result.get("documents") or [[]])[0]
        return "\n".join(docs)
