# Development Environment
Conda environment named "websites"

# UI library
shadcn: https://ui.shadcn.com

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

## Collections: chats

Path: /chats/{messageId}

chatId is constructed from a sorted concatenation of two uid, so that each chatId can uniquely identify a conversation between 2 unique users.

Fields:
- chatId: string
- timestamp: timestamp
- content: string
- from: string (uid of the sender)
- to: string (uid of the receiver)
