# Build stage
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY tripsync-backend/pom.xml .
COPY tripsync-backend/src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
