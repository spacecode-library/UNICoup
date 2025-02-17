# Use the official Node.js image as the base image
FROM node:21.1.0

# Set the working directory inside the container
WORKDIR /

# Copy package.json and package-lock.json (if exists) from the backend folder
COPY package*.json ./

# Install project dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application code from the backend folder
COPY . .

# Expose the port your app runs on (e.g., 3000)
EXPOSE 3000

# Define the command to run your app
CMD ["npm", "start"]