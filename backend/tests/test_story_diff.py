from app import models
from app.services.story_diff import generate_story_diff


def test_generate_story_diff(db):
    source_a = models.Source(name="Source A", type="rss", url="http://a.com", category="tech")
    source_b = models.Source(name="Source B", type="rss", url="http://b.com", category="tech")
    db.add_all([source_a, source_b])
    db.commit()

    story = models.Story(canonical_title="AI Breakthrough", confidence=0.9)
    db.add(story)
    db.commit()

    article_a = models.Article(
        source_id=source_a.id,
        title="AI Breakthrough Announced",
        summary_raw="Researchers announce a new AI model.",
        url="http://a.com/1",
        hash_url="hash-a-1",
        hash_title="hash-a-title",
    )
    article_b = models.Article(
        source_id=source_b.id,
        title="New AI Model Released",
        summary_raw="A new artificial intelligence model is released today.",
        url="http://b.com/1",
        hash_url="hash-b-1",
        hash_title="hash-b-title",
    )
    db.add_all([article_a, article_b])
    db.commit()

    link_a = models.StoryArticleLink(story_id=story.id, article_id=article_a.id, relation="primary")
    link_b = models.StoryArticleLink(story_id=story.id, article_id=article_b.id, relation="primary")
    db.add_all([link_a, link_b])
    db.commit()

    # Refresh story links.
    db.refresh(story)

    diff = generate_story_diff(story)
    assert diff.story_id == story.id
    assert len(diff.articles) == 2
    assert "Source A" in diff.sources
    assert "Source B" in diff.sources
    assert "ai" in diff.common_words
