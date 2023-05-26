# HID Session Auth schema

This is a custom authentication schema for Hapi that leverages our existing implementation of `yar` and all of its configuration: caching, encryption, and so forth.

```mermaid
flowchart TD
  Incoming[Incoming request] --> HasUser{Does the session\ncontain a valid user?}
  HasUser -->|Yes| Authenticated(Pass user object to the route handler,\nwhere it's guaranteed to exist.)
  HasUser -->|No| Unauthorized(Redirect to root with warning message)
```
