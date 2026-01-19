#!/bin/bash

# Bodh Docker Deployment Script for EC2
# Run this script on the EC2 instance as root

set -e  # Exit on error

echo "=========================================="
echo "Bodh Docker Deployment Script"
echo "=========================================="

# Configuration
IMAGE_TAG="prod-eac7fe5"
IMAGE_URI="962978315301.dkr.ecr.ap-south-1.amazonaws.com/namespace/bodh:${IMAGE_TAG}"
CONTAINER_NAME="bodh-app"

# Step 1: Stop and remove existing container
echo ""
echo "Step 1: Stopping existing containers..."
if [ "$(docker ps -q)" ]; then
    docker stop $(docker ps -q)
    echo "✓ Containers stopped"
else
    echo "✓ No running containers to stop"
fi

if [ "$(docker ps -aq)" ]; then
    docker rm $(docker ps -aq)
    echo "✓ Old containers removed"
fi

# Step 2: Authenticate with ECR
echo ""
echo "Step 2: Authenticating with AWS ECR..."
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 962978315301.dkr.ecr.ap-south-1.amazonaws.com
echo "✓ ECR authentication successful"

# Step 3: Pull the latest image
echo ""
echo "Step 3: Pulling Docker image ${IMAGE_TAG}..."
docker pull ${IMAGE_URI}
echo "✓ Image pulled successfully"

# Step 4: Run the new container
echo ""
echo "Step 4: Starting new container..."
docker run -p 80:3000 -d \
  --name ${CONTAINER_NAME} \
  --restart unless-stopped \
  -e DATABASE_URL='postgresql://prism:kP0!nt@123@13.200.145.92:5432/budh_adi' \
  -e GEMINI_API_KEY='AIzaSyBA_3BoGe5ZOi' \
  -e LIVEKIT_URL='wss://livekit.kpoint.ai' \
  -e LIVEKIT_API_KEY='API2xJx7wdrMVkQ' \
  -e LIVEKIT_API_SECRET='PeilFr6CbZWii0B1NYXZZOj67oYo0fefse46IxpKcqVE' \
  ${IMAGE_URI}

echo "✓ Container started successfully"

# Step 5: Verify container is running
echo ""
echo "Step 5: Verifying deployment..."
sleep 3
if [ "$(docker ps -q -f name=${CONTAINER_NAME})" ]; then
    echo "✓ Container is running"
    docker ps -f name=${CONTAINER_NAME}
else
    echo "✗ Container failed to start"
    echo "Container logs:"
    docker logs ${CONTAINER_NAME}
    exit 1
fi

echo ""
echo "=========================================="
echo "✓ Deployment completed successfully!"
echo "=========================================="
echo "Container ID: $(docker ps -q -f name=${CONTAINER_NAME})"
echo "Access your app at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo ""
echo "Useful commands:"
echo "  View logs:    docker logs -f ${CONTAINER_NAME}"
echo "  Stop:         docker stop ${CONTAINER_NAME}"
echo "  Restart:      docker restart ${CONTAINER_NAME}"
echo "=========================================="
