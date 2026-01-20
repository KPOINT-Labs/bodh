# Bodh Deployment Scripts

This directory contains deployment scripts for the Bodh application.

## Files

- `deploy-bodh.sh` - Main deployment script for EC2

## Usage on EC2

### 1. Copy script to EC2

```bash
# From your local machine
scp scripts/deploy-bodh.sh your-ec2-user@your-ec2-ip:/home/ec2-user/
```

### 2. SSH into EC2

```bash
ssh your-ec2-user@your-ec2-ip
```

### 3. Switch to root

```bash
sudo su
```

### 4. Edit production URL (IMPORTANT)

```bash
nano deploy-bodh.sh
```

Find and change this line:
```bash
PRODUCTION_URL="https://your-production-domain.com"
```

To your actual production domain.

### 5. Make script executable (if not already)

```bash
chmod +x deploy-bodh.sh
```

### 6. Run deployment

```bash
./deploy-bodh.sh
```

## What the script does

1. ✅ Authenticates with AWS ECR (ap-south-1 region)
2. ✅ Pulls the latest Docker image: `prod-fd6a126`
3. ✅ Stops and removes existing containers
4. ✅ Cleans up old containers
5. ✅ Starts new container with all environment variables
6. ✅ Performs health check
7. ✅ Shows container status

## Container Details

- **Name**: `bodh-app`
- **Port**: 80 → 3000
- **Restart Policy**: unless-stopped
- **Image**: `962978315301.dkr.ecr.ap-south-1.amazonaws.com/namespace/bodh:prod-fd6a126`

## Useful Commands

```bash
# View logs
docker logs -f bodh-app

# Stop container
docker stop bodh-app

# Start container
docker start bodh-app

# Restart container
docker restart bodh-app

# Remove container
docker rm -f bodh-app

# Check container status
docker ps --filter name=bodh-app
```

## Environment Variables

The script configures the following environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - Auth.js JWT encryption secret
- `AUTH_URL` - Production URL (MUST BE CHANGED)
- `NEXT_PUBLIC_PRISM_API_URL` - PRISM API endpoint
- `GEMINI_API_KEY` - Google Gemini API key
- `AUTH_GOOGLE_ID` - Google OAuth client ID
- `AUTH_GOOGLE_SECRET` - Google OAuth client secret
- `LIVEKIT_URL` - LiveKit server URL
- `LIVEKIT_API_KEY` - LiveKit API key
- `LIVEKIT_API_SECRET` - LiveKit API secret
- `TTS_PROVIDER` - Text-to-speech provider (elevenlabs)
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `OPENAI_API_KEY` - OpenAI API key (TTS fallback)

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs bodh-app

# Check if port 80 is already in use
sudo netstat -tulpn | grep :80
```

### Authentication fails

Make sure AWS CLI is configured with proper credentials:
```bash
aws configure
```

### Permission denied

Make sure you're running as root:
```bash
sudo su
```

## Current Image Tag

**prod-fd6a126** (commit hash: fd6a126)

To deploy a different version, edit the `IMAGE_TAG` variable in the script.
