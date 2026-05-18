"""
Pydantic schemas for request/response validation
"""

from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None


# Saved Search schemas
class SavedSearchBase(BaseModel):
    name: Optional[str] = None
    origin: str
    destination: str
    departure_date: str
    return_date: Optional[str] = None
    passengers: int = 1
    cabin_class: str = "Economy"
    saved_price: Optional[float] = None
    saved_flight_data: Optional[Dict[str, Any]] = None
    price_alert_threshold: Optional[float] = None


class SavedSearchCreate(SavedSearchBase):
    pass


class SavedSearchUpdate(BaseModel):
    name: Optional[str] = None
    price_alert_threshold: Optional[float] = None


class SavedSearchResponse(SavedSearchBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Activity schemas
class UserActivityCreate(BaseModel):
    activity_type: str
    search_params: Optional[Dict[str, Any]] = None
    best_price_found: Optional[float] = None


class UserActivityResponse(BaseModel):
    id: int
    user_id: int
    activity_type: str
    search_params: Optional[Dict] = None
    best_price_found: Optional[float] = None
    created_at: datetime
    
    class Config:
        from_attributes = True