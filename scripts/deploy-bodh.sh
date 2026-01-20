#!/bin/bash

# =============================================================================
# Bodh Docker Deployment Script
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_TAG="prod-fd6a126"
ECR_REGISTRY="962978315301.dkr.ecr.ap-south-1.amazonaws.com"
ECR_REPO="namespace/bodh"
FULL_IMAGE="${ECR_REGISTRY}/${ECR_REPO}:${IMAGE_TAG}"
REGION="ap-south-1"

# Production URL (CHANGE THIS TO YOUR ACTUAL DOMAIN)
PRODUCTION_URL="https://your-production-domain.com"

echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}Bodh Docker Deployment${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo -e "Image: ${YELLOW}${FULL_IMAGE}${NC}\n"

# Step 1: Authenticate with AWS ECR
echo -e "${YELLOW}[1/5] Authenticating with AWS ECR...${NC}"
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
echo -e "${GREEN}✓ Authentication successful${NC}\n"

# Step 2: Pull the latest image
echo -e "${YELLOW}[2/5] Pulling Docker image from ECR...${NC}"
docker pull ${FULL_IMAGE}
echo -e "${GREEN}✓ Image pulled successfully${NC}\n"

# Step 3: Stop and remove existing containers
echo -e "${YELLOW}[3/5] Stopping existing containers...${NC}"
EXISTING_CONTAINERS=$(docker ps -q --filter ancestor=${ECR_REGISTRY}/${ECR_REPO})
if [ ! -z "$EXISTING_CONTAINERS" ]; then
    echo "Stopping containers: $EXISTING_CONTAINERS"
    docker stop $EXISTING_CONTAINERS
    docker rm $EXISTING_CONTAINERS
    echo -e "${GREEN}✓ Existing containers stopped and removed${NC}\n"
else
    echo -e "${GREEN}✓ No existing containers found${NC}\n"
fi

# Step 4: Clean up old containers
echo -e "${YELLOW}[4/5] Cleaning up stopped containers...${NC}"
docker container prune -f
echo -e "${GREEN}✓ Cleanup complete${NC}\n"

# Step 5: Run the new container
# NOTE: Set these environment variables before running this script:
#   DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET,
#   GEMINI_API_KEY, LIVEKIT_API_KEY, LIVEKIT_API_SECRET,
#   ELEVENLABS_API_KEY, OPENAI_API_KEY
echo -e "${YELLOW}[5/5] Starting new container...${NC}"
docker run -p 80:3000 -d \
  --name bodh-app \
  --restart unless-stopped \
  -e DATABASE_URL="${DATABASE_URL}" \
  -e AUTH_SECRET="${AUTH_SECRET}" \
  -e AUTH_URL="${PRODUCTION_URL}" \
  -e NEXT_PUBLIC_PRISM_API_URL='http://localhost:8002/ai/prism' \
  -e GEMINI_API_KEY="${GEMINI_API_KEY}" \
  -e AUTH_GOOGLE_ID="${AUTH_GOOGLE_ID}" \
  -e AUTH_GOOGLE_SECRET="${AUTH_GOOGLE_SECRET}" \
  -e LIVEKIT_URL='wss://livekit.kpoint.ai' \
  -e LIVEKIT_API_KEY="${LIVEKIT_API_KEY}" \
  -e LIVEKIT_API_SECRET="${LIVEKIT_API_SECRET}" \
  -e TTS_PROVIDER='elevenlabs' \
  -e ELEVENLABS_API_KEY="${ELEVENLABS_API_KEY}" \
  -e OPENAI_API_KEY="${OPENAI_API_KEY}" \
  ${FULL_IMAGE}

echo -e "${GREEN}✓ Container started successfully${NC}\n"

# Get container ID
CONTAINER_ID=$(docker ps -q --filter name=bodh-app)

echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo -e "Container ID: ${YELLOW}${CONTAINER_ID}${NC}"
echo -e "Image: ${YELLOW}${FULL_IMAGE}${NC}"
echo -e "Port: ${YELLOW}80:3000${NC}\n"

# Show container status
echo -e "${YELLOW}Container Status:${NC}"
docker ps --filter name=bodh-app --format "table {{.ID}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n${YELLOW}View logs:${NC} docker logs -f bodh-app"
echo -e "${YELLOW}Stop container:${NC} docker stop bodh-app"
echo -e "${YELLOW}Restart container:${NC} docker restart bodh-app"

# Wait a few seconds and check if container is still running
echo -e "\n${YELLOW}Checking container health...${NC}"
sleep 5
if [ $(docker ps -q --filter name=bodh-app | wc -l) -eq 1 ]; then
    echo -e "${GREEN}✓ Container is running successfully!${NC}"
else
    echo -e "${RED}✗ Container failed to start. Check logs with: docker logs bodh-app${NC}"
    exit 1
fi
