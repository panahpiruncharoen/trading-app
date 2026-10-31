# Firestore Database Schema

## Collections: users

Path: /users/{uid}

Fields:
- country: string
- createdAt: timestamp
- email: string
- firstName: string
- lastName: string
- phoneNumber: string

## Collections: posts

Path: /posts/{postId}

Fields:
- content: string
- timestamp: timestamp
- title: string
- uid: string
