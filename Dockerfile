# Use the official node image as the base
FROM node

# Create a working directory
WORKDIR /usr/src/app

# Copy the package.json file and install the dependencies
COPY package.json .
RUN npm install

# Copy the app.js file
COPY app.js .

# Expose the port 3000
EXPOSE 3000

# Set the app.js file as the entrypoint
ENTRYPOINT ["node", "app.js"]
