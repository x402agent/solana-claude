"""Test script for Twitter integration"""

import asyncio
from config import load_config
from clients.twitter_client import TwitterClient


async def test_twitter():
    """Test Twitter client initialization and posting."""

    print("🐦 Testing Twitter Integration\n")
    print("=" * 60)

    # Load config
    print("\n1. Loading configuration...")
    config = load_config()

    # Check if Twitter credentials are configured
    if not all([
        config.twitter_consumer_key,
        config.twitter_consumer_secret,
        config.twitter_access_token,
        config.twitter_access_token_secret,
    ]):
        print("❌ Twitter credentials not configured in .env.local")
        return

    print("✓ Twitter credentials found")

    # Initialize Twitter client
    print("\n2. Initializing Twitter client...")
    twitter = TwitterClient(
        consumer_key=config.twitter_consumer_key,
        consumer_secret=config.twitter_consumer_secret,
        access_token=config.twitter_access_token,
        access_token_secret=config.twitter_access_token_secret,
        bearer_token=config.twitter_bearer_token,
    )
    print("✓ Twitter client initialized")

    # Get authenticated user info
    print("\n3. Testing authentication...")
    try:
        user_info = await twitter.get_authenticated_user()
        print(f"✓ Authenticated as: @{user_info['username']} ({user_info['name']})")
        print(f"   User ID: {user_info['id']}")
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return

    # Test posting a tweet
    print("\n4. Testing tweet posting...")
    test_tweet = "🧪 Testing MAWD Twitter integration! The AI Solana trading agent is now connected. 🌊 #Solana #AI"

    print(f"   Tweet text: {test_tweet}")
    print(f"   Length: {len(test_tweet)} characters")

    response = input("\n   Post this test tweet? (y/n): ")
    if response.lower() == 'y':
        try:
            result = await twitter.post_tweet(test_tweet)
            if result.success:
                print(f"✓ Tweet posted successfully!")
                print(f"   Tweet ID: {result.tweet_id}")
                print(f"   URL: {result.url}")
            else:
                print(f"❌ Failed to post tweet: {result.error}")
        except Exception as e:
            print(f"❌ Error posting tweet: {e}")
    else:
        print("   Skipped posting test tweet")

    print("\n" + "=" * 60)
    print("✓ Twitter integration test complete!")


if __name__ == "__main__":
    asyncio.run(test_twitter())
