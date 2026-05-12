"""Twitter/X Client - Wrapper for Twitter API v2 using Tweepy"""

import tweepy
from typing import Optional, List
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class TweetResult:
    """Result from posting a tweet"""
    tweet_id: str
    text: str
    url: str
    success: bool
    error: Optional[str] = None


class TwitterClient:
    """Python client for Twitter API v2"""

    def __init__(
        self,
        consumer_key: str,
        consumer_secret: str,
        access_token: str,
        access_token_secret: str,
        bearer_token: Optional[str] = None,
    ):
        """
        Initialize Twitter client with API credentials.

        Args:
            consumer_key: Twitter API consumer key
            consumer_secret: Twitter API consumer secret
            access_token: Twitter access token
            access_token_secret: Twitter access token secret
            bearer_token: Optional bearer token for read-only operations
        """
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.access_token = access_token
        self.access_token_secret = access_token_secret
        self.bearer_token = bearer_token

        # Initialize Tweepy client for API v2
        self.client = tweepy.Client(
            bearer_token=bearer_token,
            consumer_key=consumer_key,
            consumer_secret=consumer_secret,
            access_token=access_token,
            access_token_secret=access_token_secret,
        )

        # Store authenticated user info
        self._user_info = None

        logger.info("Twitter client initialized")

    async def get_authenticated_user(self) -> dict:
        """Get information about the authenticated user"""
        try:
            if not self._user_info:
                me = self.client.get_me()
                self._user_info = {
                    "id": me.data.id,
                    "username": me.data.username,
                    "name": me.data.name,
                }
            return self._user_info
        except Exception as e:
            logger.error(f"Failed to get authenticated user: {e}")
            raise

    async def post_tweet(
        self,
        text: str,
        reply_to_tweet_id: Optional[str] = None,
        quote_tweet_id: Optional[str] = None,
    ) -> TweetResult:
        """
        Post a tweet to Twitter/X.

        Args:
            text: Tweet content (max 280 characters for standard accounts)
            reply_to_tweet_id: Optional tweet ID to reply to
            quote_tweet_id: Optional tweet ID to quote tweet

        Returns:
            TweetResult with tweet details and URL
        """
        try:
            # Validate text length
            if len(text) > 280:
                return TweetResult(
                    tweet_id="",
                    text=text,
                    url="",
                    success=False,
                    error=f"Tweet too long: {len(text)} characters (max 280)"
                )

            # Post the tweet
            kwargs = {"text": text}
            if reply_to_tweet_id:
                kwargs["in_reply_to_tweet_id"] = reply_to_tweet_id
            if quote_tweet_id:
                kwargs["quote_tweet_id"] = quote_tweet_id

            response = self.client.create_tweet(**kwargs)

            tweet_id = response.data["id"]
            user_info = await self.get_authenticated_user()
            username = user_info["username"]
            tweet_url = f"https://twitter.com/{username}/status/{tweet_id}"

            logger.info(f"Successfully posted tweet: {tweet_url}")

            return TweetResult(
                tweet_id=tweet_id,
                text=text,
                url=tweet_url,
                success=True,
            )

        except tweepy.TweepyException as e:
            error_msg = str(e)
            logger.error(f"Failed to post tweet: {error_msg}")
            return TweetResult(
                tweet_id="",
                text=text,
                url="",
                success=False,
                error=error_msg,
            )
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(f"Failed to post tweet: {error_msg}")
            return TweetResult(
                tweet_id="",
                text=text,
                url="",
                success=False,
                error=error_msg,
            )

    async def get_recent_tweets(
        self,
        username: Optional[str] = None,
        max_results: int = 10
    ) -> List[dict]:
        """
        Get recent tweets from a user.

        Args:
            username: Username to fetch tweets from (defaults to authenticated user)
            max_results: Maximum number of tweets to return (default 10, max 100)

        Returns:
            List of tweet dictionaries
        """
        try:
            if username:
                # Get user by username
                user = self.client.get_user(username=username)
                user_id = user.data.id
            else:
                # Get authenticated user
                user_info = await self.get_authenticated_user()
                user_id = user_info["id"]

            # Get user's tweets
            tweets = self.client.get_users_tweets(
                id=user_id,
                max_results=min(max_results, 100),
                tweet_fields=["created_at", "public_metrics", "entities"]
            )

            if not tweets.data:
                return []

            return [
                {
                    "id": tweet.id,
                    "text": tweet.text,
                    "created_at": str(tweet.created_at),
                    "metrics": tweet.public_metrics if hasattr(tweet, "public_metrics") else None,
                }
                for tweet in tweets.data
            ]

        except Exception as e:
            logger.error(f"Failed to get recent tweets: {e}")
            return []

    async def search_tweets(
        self,
        query: str,
        max_results: int = 10
    ) -> List[dict]:
        """
        Search for tweets matching a query.

        Args:
            query: Search query string
            max_results: Maximum number of results (default 10, max 100)

        Returns:
            List of matching tweets
        """
        try:
            tweets = self.client.search_recent_tweets(
                query=query,
                max_results=min(max_results, 100),
                tweet_fields=["created_at", "public_metrics", "author_id"]
            )

            if not tweets.data:
                return []

            return [
                {
                    "id": tweet.id,
                    "text": tweet.text,
                    "created_at": str(tweet.created_at),
                    "author_id": tweet.author_id,
                    "metrics": tweet.public_metrics if hasattr(tweet, "public_metrics") else None,
                }
                for tweet in tweets.data
            ]

        except Exception as e:
            logger.error(f"Failed to search tweets: {e}")
            return []

    async def close(self):
        """Close the client connection"""
        # Tweepy client doesn't require explicit closing
        logger.info("Twitter client closed")
