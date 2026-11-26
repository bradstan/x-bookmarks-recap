"""把 bird --json-full 导出的收藏夹展开成结构化表（每条收藏一行）。

用法：python3 scripts/structure.py private/full.json private/bookmarks.csv
同时输出同名 .jsonl。
"""
import csv, json, re, sys
from datetime import datetime
from urllib.parse import urlparse

src, out = sys.argv[1], sys.argv[2]
tweets = json.load(open(src))['tweets']

def unwrap(r):
    return r.get('tweet', r) if r.get('__typename') == 'TweetWithVisibilityResults' else r

def ts(s):
    return datetime.strptime(s, '%a %b %d %H:%M:%S %z %Y') if s else None

rows = []
for order, t in enumerate(tweets):
    r = unwrap(t.get('_raw') or {})
    lg = r.get('legacy') or {}
    u = ((r.get('core') or {}).get('user_results') or {}).get('result') or {}
    ul = u.get('legacy') or {}
    uc = u.get('core') or {}
    note = (((r.get('note_tweet') or {}).get('note_tweet_results') or {}).get('result') or {})
    text = note.get('text') or lg.get('full_text') or t.get('text', '')
    ents = lg.get('entities') or {}
    urls = [x.get('expanded_url', '') for x in ents.get('urls', [])]
    urls += [x.get('expanded_url', '') for x in (note.get('entity_set') or {}).get('urls', [])]
    domains = sorted({urlparse(x).netloc.replace('www.', '') for x in urls if x})
    media = (lg.get('extended_entities') or {}).get('media', [])
    card = (r.get('card') or {}).get('legacy') or {}
    bv = {b['key']: b['value'].get('string_value') for b in card.get('binding_values', []) if 'string_value' in b.get('value', {})}
    q = unwrap(((r.get('quoted_status_result') or {}).get('result')) or {})
    qu = (((q.get('core') or {}).get('user_results') or {}).get('result') or {})
    created = ts(lg.get('created_at') or t.get('createdAt'))
    acct = ts(ul.get('created_at') or uc.get('created_at'))
    views = (r.get('views') or {}).get('count')
    rows.append({
        'order': order,  # 0 = 最近收藏
        'id': t['id'],
        'url': f"https://x.com/{t['author']['username']}/status/{t['id']}",
        'created_at': created.isoformat() if created else '',
        'lang': lg.get('lang', ''),
        'text': text,
        'text_len': len(re.sub(r'https?://\S+', '', text).strip()),
        'is_long_post': bool(note),
        'is_article': any('/i/article/' in x for x in urls),
        'is_reply': bool(lg.get('in_reply_to_status_id_str')),
        'is_quote': bool(lg.get('is_quote_status')),
        'quoted_author': ((qu.get('core') or {}).get('screen_name') or (qu.get('legacy') or {}).get('screen_name') or ''),
        'media_photos': sum(m.get('type') == 'photo' for m in media),
        'media_videos': sum(m.get('type') in ('video', 'animated_gif') for m in media),
        'video_ms': sum((m.get('video_info') or {}).get('duration_millis', 0) for m in media),
        'link_domains': '|'.join(domains),
        'card_title': bv.get('title') or '',
        'card_domain': bv.get('domain') or bv.get('vanity_url') or '',
        'hashtags': '|'.join(h['text'] for h in ents.get('hashtags', [])),
        'mentions': '|'.join(m['screen_name'] for m in ents.get('user_mentions', [])),
        'likes': lg.get('favorite_count', 0),
        'retweets': lg.get('retweet_count', 0),
        'replies': lg.get('reply_count', 0),
        'quotes': lg.get('quote_count', 0),
        'bookmarks_global': lg.get('bookmark_count', 0),
        'views': int(views) if views and views.isdigit() else '',
        'i_liked': lg.get('favorited', False),
        'i_retweeted': lg.get('retweeted', False),
        'author': t['author']['username'],
        'author_name': t['author'].get('name', ''),
        'author_followers': ul.get('followers_count', 0),
        'author_following': ul.get('friends_count', 0),
        'author_posts': ul.get('statuses_count', 0),
        'author_blue': u.get('is_blue_verified', False),
        'author_created': acct.isoformat() if acct else '',
        'author_bio': ul.get('description', ''),
        'author_location': ul.get('location', '') or (u.get('location') or {}).get('location', ''),
        'i_follow_author': ul.get('following', False) or (u.get('relationship_perspectives') or {}).get('following', False),
        'author_follows_me': ul.get('followed_by', False) or (u.get('relationship_perspectives') or {}).get('followed_by', False),
    })

# 收藏时间下限：列表按收藏时间倒序，某条的收藏时间 ≥ 它之后所有推文的发布时间
mx = None
for row in reversed(rows):
    c = row['created_at']
    mx = c if (mx is None or c > mx) else mx
    row['saved_at_lb'] = mx

with open(out, 'w', newline='', encoding='utf-8-sig') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader(); w.writerows(rows)
with open(out.rsplit('.', 1)[0] + '.jsonl', 'w', encoding='utf-8') as f:
    for row in rows: f.write(json.dumps(row, ensure_ascii=False) + '\n')
print(len(rows), 'rows ->', out)
