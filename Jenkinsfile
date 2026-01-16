pipeline {
    agent any

    // Schedule: Run at 9 AM IST daily (3:30 AM UTC)
    triggers {
        cron('30 3 * * *')
    }

    environment {
        // AWS Configuration
        AWS_REGION = 'ap-south-1'
        ECR_REGISTRY = '962978315301.dkr.ecr.ap-south-1.amazonaws.com'
        ECR_REPOSITORY = 'namespace/bodh'
        IMAGE_TAG = "prod-${GIT_COMMIT.take(7)}"

        // EC2 Configuration
        EC2_HOST = credentials('bodh-ec2-host')           // EC2 IP/hostname
        EC2_USER = 'ec2-user'                              // or 'ubuntu' depending on AMI
        EC2_SSH_KEY = credentials('bodh-ec2-ssh-key')     // SSH private key

        // Application Configuration
        DATABASE_URL = credentials('bodh-database-url')
        GEMINI_API_KEY = credentials('bodh-gemini-api-key')

        // Container Configuration
        CONTAINER_NAME = 'bodh-app'
        CONTAINER_PORT = '3000'
        HOST_PORT = '3000'
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Pulling latest code...'
                checkout scm

                script {
                    env.GIT_COMMIT_MSG = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()
                }

                echo "Commit: ${GIT_COMMIT}"
                echo "Message: ${GIT_COMMIT_MSG}"
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'

                sh """
                    docker build -t bodh:latest .
                """
            }
        }

        stage('Push to ECR') {
            steps {
                echo 'Pushing to ECR...'

                sh """
                    # STEP 1: Authenticate Docker with AWS ECR
                    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

                    # STEP 2: Tag the Docker Image
                    docker tag bodh:latest ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}

                    # STEP 3: Push the Image to AWS ECR
                    docker push ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
                """
            }
        }

        stage('Deploy to EC2') {
            steps {
                echo 'Deploying to EC2...'

                script {
                    def deployScript = """
                        # Login to ECR
                        aws ecr get-login-password --region ${AWS_REGION} | \
                            docker login --username AWS --password-stdin ${ECR_REGISTRY}

                        # Pull latest image
                        docker pull ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}

                        # Stop and remove existing container (if running)
                        docker stop ${CONTAINER_NAME} || true
                        docker rm ${CONTAINER_NAME} || true

                        # Run new container
                        docker run -d \
                            --name ${CONTAINER_NAME} \
                            --restart unless-stopped \
                            -p ${HOST_PORT}:${CONTAINER_PORT} \
                            -e DATABASE_URL='${DATABASE_URL}' \
                            -e GEMINI_API_KEY='${GEMINI_API_KEY}' \
                            -e NODE_ENV=production \
                            ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}

                        # Cleanup old images
                        docker image prune -f

                        # Verify container is running
                        sleep 10
                        docker ps | grep ${CONTAINER_NAME}
                    """

                    sshagent(credentials: ['bodh-ec2-ssh-key']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} '${deployScript}'
                        """
                    }
                }
            }
        }

        stage('Health Check') {
            steps {
                echo 'Running health check...'

                script {
                    // Wait for app to start
                    sleep(time: 30, unit: 'SECONDS')

                    // Check if app is responding
                    sh """
                        curl -f http://${EC2_HOST}:${HOST_PORT}/ || exit 1
                    """
                }

                echo 'Application is healthy!'
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }

        failure {
            echo 'Pipeline failed!'
        }

        always {
            // Cleanup local Docker images
            sh """
                docker rmi bodh:latest || true
                docker rmi ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG} || true
            """
        }
    }
}
