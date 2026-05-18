"""
Database configuration and session management
"""

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Float, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.sql import func
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# PostgreSQL connection - Update with your pgAdmin4 credentials
# Your .env file shows: DATABASE_URL=postgresql:///postgres:Admin123@localhost:5432/helloflying
# Correct format: postgresql://username:password@host:port/database
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:Admin123@localhost:5432/helloflying"
)

# Create engine
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Import models after Base is defined
from models import User, SavedSearch, UserActivity