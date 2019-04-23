# Documentation
The Live URL can be found here: https://ultimate-timetable-utility.herokuapp.com/
## API
The API for ultimate-timetable-utility is loosely based around the REST principle, using REST-style endpoints and correct HTTP verbs without HATEOAS.
All API requests for this version of the API must be accessed through the `/api/v1` endpoint which acts as a prefix.

### Authentication
The API uses JSON Web Tokens for all authentication after the initial login request. The JWT MUST be passed via the Authorization header for all subsequent requests.
```Authorization: <Your JWT>```

The initial login must be performed using the `/api/v1/auth` endpoint.

	POST /api/v1/auth
	
Example request body:

	{
		"email":"example@example.com",
		"password":"password"
	}
	
Example response body:

	{
		"user": {
			"id": "f6a8e750-a49f-405c-91dd-20dfe1cc937a",
			"email": "example@example.com",
			"firstName": "example",
			"lastName": "example",
			"access": "user"
		},
		"token": "XXXXXXXXXXXX"
	}

### Errors
The API will return standard HTTP errors. Codes in the 2xx range indicate success, codes in the 4xx range indicate a client error and codes in the 5xx range indicate a server error.
All errors will return a JSON response containing a `type` that gives a more specific status as well as an `error` string containing a message. Some errors may contain additional `data` which further describes the error.
For example, when attempting to access an endpoint with a bad token, the following error will be returned.

    {
        "error": "Invalid or expired authorization token.",
        "type": "client_error",
        "data": {}
    }
	
A validation error will contain additional information about the fields that failed to aid in correcting the error.

	{
		"error": "Some fields in the request are invalid.",
		"type": "validation_error",
		"data": [
			{
				"resource": "Task",
				"field": "name",
				"validator": {
					"name": "length",
					"max": 50,
					"min": 1
				},
				"message": "Task name must be at least 1 characters long."
			},
			{
				"resource": "Task",
				"field": "description",
				"validator": {
					"name": "null"
				},
				"message": "Task description must be completed."
			},
			{
				"resource": "Task",
				"field": "timeStart",
				"validator": {
					"name": "null"
				},
				"message": "Task timeStart must be completed."
			},
			{
				"resource": "Task",
				"field": "timeEnd",
				"validator": {
					"name": "null"
				},
				"message": "Task timeEnd must be completed."
			}
		]
	}
	
###Users
Use this endpoint to register a new account. Additionally, users with `level: "admin"` may use this endpoint to list users.

####The User Object
Users contain the following fields:

- `id`: a `String` representing the user's ID
- `email`: a `String` between 3 and 254 characters with an '@' symbol
- `firstName`: a `String` between 1 and 50 characters
- `lastName`: a `String` between 1 and 50 characters
- `access`: a `String` containing either the value `user` or `admin`

####List all users (admin only)

	GET /api/v1/users
	
Example response body:

	[
		{
			"id": 1,
			"email": "test@example.com",
			"firstName": "Test",
			"lastName": "Tester",
			"access": "admin"
		},
		{
			"id": 2,
			"email": "test2@example.com",
			"firstName": "test",
			"lastName": "test",
			"access": "user"
		}
	]
	
####Create a user

	POST /api/v1/users
	
Example request body:

	{
		"email":"example@example.com",
		"password":"password",
		"firstName":"example",
		"lastName":"example"
	}
	
Example response body:

	{
		"id": "f6a8e750-a49f-405c-91dd-20dfe1cc937a",
		"email": "example@example.com",
		"firstName": "example",
		"lastName": "example",
		"access": "user"
	}
	
###Tasks
Use this endpoint to list, create, read, update and delete tasks

####The Task Object
Tasks contain the following fields:

- `id`: a `String` representing the task's ID
- `userId`: a `String` representing the ID of the user that created the task
- `name`: a `String` between 1 and 50 characters
- `description`: a `String` between 0 and 1000 characters
- `timeStart`: a `String` denoting a datetime in the `Y-m-d H:i:s` format
- `timeEnd`: a `String` denoting a datetime in the `Y-m-d H:i:s` format
- `places`: an `Array` containing a list of places attached to this task (readonly and only available through GET on the individual task) 

####List all of your tasks (or all tasks if user is admin)

	GET /api/v1/tasks
	
Example response body:

	[
		{
			"id": "50c83899-3597-4742-a9b1-77f16995e7a6",
			"userId": "f6a8e750-a49f-405c-91dd-20dfe1cc937a",
			"name": "Test",
			"description": "Test",
			"timeStart": "2019-01-01 00:00:00",
			"timeEnd": "2019-01-01 00:00:00"
		},
		{
			"id": "ceadab02-535e-40ca-8992-2a8cf023f14f",
			"userId": "f6a8e750-a49f-405c-91dd-20dfe1cc937a",
			"name": "Test",
			"description": "Test",
			"timeStart": "2019-04-05 00:00:00",
			"timeEnd": "2019-04-06 00:00:00"
		}
	]
	
####Create a task

	POST /api/v1/tasks
	
Example request body:

	{
		"name": "Test",
		"description": "Test",
		"timeStart": "2019-01-01 00:00:00",
		"timeEnd": "2019-01-01 00:00:00"
	}
	
Example response body:

	{
		"id": "52eacbec-1261-446d-957a-2ea03d542111",
		"userId": "f6a8e750-a49f-405c-91dd-20dfe1cc937a",
		"name": "Test",
		"description": "Test",
		"timeStart": "2019-01-01 00:00:00",
		"timeEnd": "2019-01-01 00:00:00"
	}
	
####Read a task

	GET /api/v1/tasks/:id
	
Example response body:

	{
		"id": "52eacbec-1261-446d-957a-2ea03d542111",
		"userId": "f6a8e750-a49f-405c-91dd-20dfe1cc937a",
		"name": "Test",
		"description": "Test",
		"timeStart": "2019-01-01 00:00:00",
		"timeEnd": "2019-01-01 00:00:00",
		"places": []
	}
	
A GET request for a specific task will include an array of associated places

####Update a task

	PATCH /api/v1/tasks/:id
	
Example request body:

	{
		"name": "Changed"
	}
	
Example response body:

	{
		"id": "52eacbec-1261-446d-957a-2ea03d542111",
		"userId": "f6a8e750-a49f-405c-91dd-20dfe1cc937a",
		"name": "Changed",
		"description": "Test",
		"timeStart": "2019-01-01 00:00:00",
		"timeEnd": "2019-01-01 00:00:00"
	}
	
####Delete a task

	DELETE /api/v1/tasks/:id
	
A successful delete should return a `204 No Content` HTTP header

###Places
Use this endpoint to list, create, read, update and delete places

####The Place Object
Places contain the following fields:

- `id`: a `String` representing the task's ID
- `userId`: a `String` representing the ID of the user that created the place
- `addressLine1`: a `String` between 1 and 75 characters
- `addressLine2`: a `String` between 0 and 75 characters
- `city`: a `String` between 1 and 50 characters
- `county`: a `String` between 1 and 50 characters
- `postcode`: a `String` between 1 and 15 characters
- `country`: a `String` between 2 and 75 characters
- `taskId`: a `String` representing the ID of the task to which this place is attached

####List all of your places (or all places if user is admin)

	GET /api/v1/places
	
Example response body:

	[
		{
			"id": "0d446b52-fc05-4e56-b1f3-664fb9116666",
			"userId": "f6a8e750-a49f-405c-91dd-20dfe1cc937a",
			"addressLine1": "123 Test Street",
			"addressLine2": "",
			"city": "Test",
			"county": "Test",
			"postcode": "12345",
			"country": "UK",
			"taskId": "50c83899-3597-4742-a9b1-77f16995e7a6"
		}
	]
	
####Create a place

	POST /api/v1/places
	
Example request body:

	{
		"addressLine1": "123 Test Street",
		"addressLine2": "",
		"city": "Test",
		"county": "Test",
		"postcode": "12345",
		"country": "UK",
		"taskId": "50c83899-3597-4742-a9b1-77f16995e7a6"
	}
	
Example response body:

	{
		"id": "3b74fc51-5ced-4fd2-8105-cd40514780d7",
		"userId": "f6a8e750-a49f-405c-91dd-20dfe1cc937a",
		"addressLine1": "123 Test Street",
		"addressLine2": "",
		"city": "Test",
		"county": "Test",
		"postcode": "12345",
		"country": "UK",
		"taskId": "50c83899-3597-4742-a9b1-77f16995e7a6"
	}

####Read a place

	GET /api/v1/places/:id
	
Example response body:

	{
			"id": "3b74fc51-5ced-4fd2-8105-cd40514780d7",
			"userId": "f6a8e750-a49f-405c-91dd-20dfe1cc937a",
			"addressLine1": "123 Test Street",
			"addressLine2": "",
			"city": "Test",
			"county": "Test",
			"postcode": "12345",
			"country": "UK",
			"taskId": "50c83899-3597-4742-a9b1-77f16995e7a6"
	}


####Update a place

	PATCH /api/v1/places/:id
	
Example request body:

	{
		"addressLine1": "123 Example Street",
		"addressLine2": "New address part"
	}
	
Example response body:

	{
		"id": "3b74fc51-5ced-4fd2-8105-cd40514780d7",
		"userId": "f6a8e750-a49f-405c-91dd-20dfe1cc937a",
		"addressLine1": "123 Example Street",
		"addressLine2": "New address part",
		"city": "Test",
		"county": "Test",
		"postcode": "12345",
		"country": "UK",
		"taskId": "50c83899-3597-4742-a9b1-77f16995e7a6"
	}
	
####Delete a task

	DELETE /api/v1/tasks/:id
	
A successful delete should return a `204 No Content` HTTP header

------------------

##Client
The client is a single page site that uses JavaScript requests to load pages.
- To get Started, navigate to the Register page to create your account.
- Once your account has been successfully created, you will be navigated to the login page.
- Login to the app and you will be presented with the task list screen and an option to create a task.
- Click `New Task` to create a task and complete the form
- The Start Time and End Time fields are selectors that use `datetime-local` which does not work on all browsers (e.g. Firefox) so may become plaintext fields. Ensure you enter a valid datetime in this scenario.
- Once your task is created, you may add places associated with it. Need to do your monthly shopping? Fill in the task name and description and add all the supermarkets you need to visit as places.