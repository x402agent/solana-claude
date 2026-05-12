"""Non-interactive test to post a tweet"""

import asyncio
from config import load_config
from clients.twitter_client import TwitterClient


async def test_post_tweet():
    """Test posting a tweet without user input."""

    print("🐦 Testing Twitter Post\n")

    # Load config
    config = load_config()

    # Initialize Twitter client
    twitter = TwitterClient(
        consumer_key=config.twitter_consumer_key,
        consumer_secret=config.twitter_consumer_secret,
        access_token=config.twitter_access_token,
        access_token_secret=config.twitter_access_token_secret,
        bearer_token=config.twitter_bearer_token,
    )

    # Get user info
    user_info = await twitter.get_authenticated_user()
    print(f"Authenticated as: @{user_info['username']}")

    # Post a test tweet
    test_tweet = "🌊 MAWD AI trading agent is now live with Twitter integration! Ready to share Solana trading insights. #Solana #AI #Crypto"

    print(f"\nPosting tweet: {test_tweet}")
    print(f"Length: {len(test_tweet)} characters")

    result = await twitter.post_tweet(test_tweet)

    if result.success:
        print(f"\n✓ Tweet posted successfully!")
        print(f"  Tweet ID: {result.tweet_id}")
        print(f"  URL: {result.url}")
    else:
        print(f"\n❌ Failed to post tweet: {result.error}")


if __name__ == "__main__":
    asyncio.run(test_post_tweet())
