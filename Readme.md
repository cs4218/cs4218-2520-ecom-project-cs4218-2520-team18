# CS4218 Project - Virtual Vault

## 1. Project Introduction

Virtual Vault is a full-stack MERN (MongoDB, Express.js, React.js, Node.js) e-commerce website, offering seamless connectivity and user-friendly features. The platform provides a robust framework for online shopping. The website is designed to adapt to evolving business needs and can be efficiently extended.

## 2. Website Features

- **User Authentication**: Secure user authentication system implemented to manage user accounts and sessions.
- **Payment Gateway Integration**: Seamless integration with popular payment gateways for secure and reliable online transactions.
- **Search and Filters**: Advanced search functionality and filters to help users easily find products based on their preferences.
- **Product Set**: Organized product sets for efficient navigation and browsing through various categories and collections.

## 3. Your Task

- **Unit and Integration Testing**: Utilize Jest for writing and running tests to ensure individual components and functions work as expected, finding and fixing bugs in the process.
- **UI Testing**: Utilize Playwright for UI testing to validate the behavior and appearance of the website's user interface.
- **Code Analysis and Coverage**: Utilize SonarQube for static code analysis and coverage reports to maintain code quality and identify potential issues.
- **Load Testing**: Leverage JMeter for load testing to assess the performance and scalability of the ecommerce platform under various traffic conditions.

## 4. Setting Up The Project

### 1. Installing Node.js

1. **Download and Install Node.js**:
   - Visit [nodejs.org](https://nodejs.org) to download and install Node.js.

2. **Verify Installation**:
   - Open your terminal and check the installed versions of Node.js and npm:
     ```bash
     node -v
     npm -v
     ```

### 2. MongoDB Setup

1. **Download and Install MongoDB Compass**:
   - Visit [MongoDB Compass](https://www.mongodb.com/products/tools/compass) and download and install MongoDB Compass for your operating system.

2. **Create a New Cluster**:
   - Sign up or log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).
   - After logging in, create a project and within that project deploy a free cluster.

3. **Configure Database Access**:
   - Create a new user for your database (if not alredy done so) in MongoDB Atlas.
   - Navigate to "Database Access" under "Security" and create a new user with the appropriate permissions.

4. **Whitelist IP Address**:
   - Go to "Network Access" under "Security" and whitelist your IP address to allow access from your machine.
   - For example, you could whitelist 0.0.0.0 to allow access from anywhere for ease of use.

5. **Connect to the Database**:
   - In your cluster's page on MongoDB Atlas, click on "Connect" and choose "Compass".
   - Copy the connection string.

6. **Establish Connection with MongoDB Compass**:
   - Open MongoDB Compass on your local machine, paste the connection string (replace the necessary placeholders), and establish a connection to your cluster.

### 3. Application Setup

To download and use the MERN (MongoDB, Express.js, React.js, Node.js) app from GitHub, follow these general steps:

1. **Clone the Repository**
   - Go to the GitHub repository of the MERN app.
   - Click on the "Code" button and copy the URL of the repository.
   - Open your terminal or command prompt.
   - Use the `git clone` command followed by the repository URL to clone the repository to your local machine:
     ```bash
     git clone <repository_url>
     ```
   - Navigate into the cloned directory.

2. **Install Frontend and Backend Dependencies**
   - Run the following command in your project's root directory:

     ```
     npm install && cd client && npm install && cd ..
     ```

3. **Add database connection string to `.env`**
   - Add the connection string copied from MongoDB Atlas to the `.env` file inside the project directory (replace the necessary placeholders):
     ```env
     MONGO_URL = <connection string>
     ```

4. **Adding sample data to database**
   - Download “Sample DB Schema” from Canvas and extract it.
   - In MongoDB Compass, create a database named `test` under your cluster.
   - Add four collections to this database: `categories`, `orders`, `products`, and `users`.
   - Under each collection, click "ADD DATA" and import the respective JSON from the extracted "Sample DB Schema".

5. **Running the Application**
   - Open your web browser.
   - Use `npm run dev` to run the app from root directory, which starts the development server.
   - Navigate to `http://localhost:3000` to access the application.

### 4. Seeding an Admin User for E2E

The backend seeds an admin account only when `E2E_SEED_ADMIN=true`.
This is used by Playwright E2E startup and is idempotent (create once, then update if needed).

- Default seeded admin login:
  - Email: `admin.e2e@example.com`
  - Password: `Password123`

The Playwright config already enables this flag for E2E runs. You can customize seed values with:

```env
DISABLE_ADMIN_SEED=false
E2E_SEED_ADMIN=true
SEED_ADMIN_NAME=E2E Admin User
SEED_ADMIN_EMAIL=admin.e2e@example.com
SEED_ADMIN_PASSWORD=Password123
SEED_ADMIN_PHONE=+14155550000
SEED_ADMIN_ADDRESS=1 Admin Street
SEED_ADMIN_ANSWER=blue
SEED_ADMIN_DOB=2000-01-01
```

## 5. Unit Testing with Jest

Unit testing is a crucial aspect of software development aimed at verifying the functionality of individual units or components of a software application. It involves isolating these units and subjecting them to various test scenarios to ensure their correctness.  
Jest is a popular JavaScript testing framework widely used for unit testing. It offers a simple and efficient way to write and execute tests in JavaScript projects.

### Getting Started with Jest

To begin unit testing with Jest in your project, follow these steps:

1. **Install Jest**:  
   Use your preferred package manager to install Jest. For instance, with npm:

   ```bash
   npm install --save-dev jest

   ```

2. **Write Tests**  
   Create test files for your components or units where you define test cases to evaluate their behaviour.

3. **Run Tests**  
   Execute your tests using Jest to ensure that your components meet the expected behaviour.  
   You can run the tests by using the following command in the root of the directory:
   - **Frontend tests**

     ```bash
     npm run test:frontend
     ```

   - **Backend tests**

     ```bash
     npm run test:backend
     ```

   - **All the tests**
     ```bash
     npm run test
     ```

## 6. Workload

1. Loh Ze Qing Norbert  
   Unit Tests:
   - helpers/authHelper.test.js
   - helpers/validationHelper.test.js
   - middlewares/authMiddleware.test.js
   - controllers/registerController.test.js
   - controllers/loginController.test.js
   - controllers/forgotPasswordController.test.js
   - controllers/testController.test.js
   - controllers/userController.test.js
   - models/userModel.test.js
   - client/src/context/auth.test.js
   - client/src/pages/Auth/Register.test.js
   - client/src/pages/Auth/Login.test.js
   - client/src/pages/Auth/ForgotPassword.test.js
   - client/src/components/Routes/Private.test.js
   - client/src/components/UserMenu.test.js
   - client/src/pages/user/Dashboard.test.js
   - client/src/pages/user/Profile.test.js
   - client/src/helpers/validation.test.js

   Integration Tests:
   - routes/authRoute.integration.test.js
   - controllers/registerController.integration.test.js
   - controllers/loginController.integration.test.js
   - controllers/forgotPasswordController.integration.test.js
   - controllers/userController.integration.test.js
   - helpers/authHelper.integration.test.js
   - middlewares/authMiddleware.integration.test.js
   - models/userModel.integration.test.js
   - client/src/context/auth.integration.test.js
   - client/src/pages/Auth/Register.integration.test.js
   - client/src/pages/Auth/Login.integration.test.js
   - client/src/pages/Auth/ForgotPassword.integration.test.js
   - client/src/components/Routes/Private.integration.test.js
   - client/src/components/Routes/AdminRoute.integration.test.js
   - client/src/components/UserMenu.integration.test.js
   - client/src/pages/user/Dashboard.integration.test.js
   - client/src/pages/user/Profile.integration.test.js

   End-to-End/UI Tests:
   - e2e/registration-flows.spec.js (Registration flows)
   - e2e/login-flows.spec.js (Login flows)
   - e2e/logout-session-flows.spec.js (Logout and session management)
   - e2e/forgot-password-flows.spec.js (Password reset flows)
   - e2e/protected-routes-flows.spec.js (Protected route access control)
   - e2e/profile-flows.spec.js (User profile update flows)
   - e2e/auth-user-journeys.spec.js (Complete authentication journeys: Register → Login → Update Profile → Logout → Protected Route → Re-login)
   - e2e/admin-dashboard-flows.spec.js (Admin dashboard flows)

   Load/Stress Test Scripts:
   - nfr/spike-testing/seed-loadtest-users.js
   - nfr/spike-testing/step-stress-test.js
   - nfr/spike-testing/teardown-loadtest-users.js

2. Lim Kok Liang  
   Unit Tests:
   - controllers/categoryController.test.js
   - controllers/productController.test.js
   - client/src/components/Form/CategoryForm.test.js
   - client/src/pages/admin/Users.test.js
   - client/src/pages/admin/Products.test.js
   - client/src/pages/admin/CreateProduct.test.js
   - client/src/pages/admin/UpdateProduct.test.js
   - client/src/pages/admin/CreateCategory.test.js
   - client/src/pages/admin/AdminOrders.test.js

   Integration Tests:
    - client/src/pages/admin/Products.integration.test.js
    - client/src/pages/admin/CreateProduct.integration.test.js
    - client/src/pages/admin/UpdateProduct.integration.test.js

   End-to-End/UI Tests:
   - e2e/admin-categories.spec.js (Admin category management flows)
   - e2e/admin-products.spec.js (Admin product management flows)
   - e2e/admin-orders.spec.js (Admin order management flows)
   - e2e/admin-users.spec.js (Admin user management flows)

3. Sherwyn Ng Cheng Xin  
   Unit Tests:
   - client/src/pages/Contact.test.js
   - client/src/pages/Policy.test.js
   - client/src/components/Footer.test.js
   - client/src/components/Header.test.js
   - client/src/components/Layout.test.js
   - client/src/components/Spinner.test.js
   - client/src/pages/About.test.js
   - client/src/pages/Pagenotfound.test.js
   - client/src/pages/HomePage.test.js
   - client/src/context/cart.test.js
   - client/src/pages/CartPage.test.js
   - config/db.test.js
   - controllers/productController.test.js

   Integration Tests:
   - client/src/components/Footer.integration.test.js
   - client/src/components/Header.integration.test.js
   - client/src/components/Layout.integration.test.js
   - client/src/context/cart.integration.test.js
   - client/src/pages/CartPage.integration.test.js
   - client/src/pages/HomePage.integration.test.js
   - config/db.integration.test.js

   End-to-End/UI Tests:
   - e2e/footer-flows.spec.js
   - e2e/header-flows.spec.js
   - e2e/homepage-flow.spec.js
   - e2e/static-pages-flow.spec.js

4. Billy Ho Cheng En  
   Unit Tests:
   - client/src/pages/ProductDetails.test.js
   - client/src/pages/categoryProduct.test.js
   - controllers/productController.test.js
     - getProductController
     - getSingleProductController
     - productPhotoController
     - productFiltersController
     - productCountController
     - productListController
     - searchProductController
     - realtedProductController
     - productCategoryController

   Integration Tests:
   - client/src/components/AdminMenu.integration.test.js
   - client/src/pages/admin/AdminDashboard.integration.test.js
   - client/src/pages/CategoryProduct.integration.test.js
   - client/src/pages/ProductDetails.integration.test.js
   - controllers/orderController.integration.test.js
   - controllers/categoryController.integration.test.js
   - controllers/productController.integration.test.js

   End-to-End/UI Tests:
   - e2e/browsing-flows.spec.js
   - e2e/cart-flows.spec.js

5. Aw Jean Leng Adrian  
   Unit Tests:
   - controllers/categoryController.test.js
   - controllers/orderController.test.js
   - client/src/components/Form/SearchInput.test.js
   - client/src/context/search.test.js
   - client/src/hooks/useCategory.test.js
   - client/src/pages/user/Orders.test.js
   - client/src/pages/Categories.test.js
   - client/src/pages/Search.test.js

   Integration Tests:
   - controllers/orderController.integration.test.js
   - controllers/searchProduct.integration.test.js
   - client/src/pages/Search.integration.test.js
   - client/src/hooks/useCategory.integration.test.js

   UI Tests:
   - e2e/orders-flows.spec.js
   - e2e/search-flows.spec.js

## 7. AI Declaration

AI tools such as Copilot and Gemini were used throughout the milestone.  
Use of AI included:

- Generating boilerplate code for unit tests.
- Assisting in writing test cases and assertions.
- Providing suggestions for test structure and organization.
- Debugging and troubleshooting test failures.
- Reviewing and improving test coverage.
- Checking for best practices in test writing and implementation.
- Assisted in planning and refinement of Milestone 1 tasks and workload distribution.

## MS1 CI URL

- [MS1 CI URL](https://github.com/cs4218/cs4218-2520-ecom-project-cs4218-2520-team18/actions/runs/22281766846/job/64453440650)
