const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const uuidv4 = require('uuid/v4');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const dataPath = 'data/';
const fs = require('fs');
const JWT_SECRET = '218b4ad84ffeabb60dc7aca13a293af7482286feb07527feb09cf9b7d54eef4c987a6f4b693b9a0963dd4cf01fa2944434cda99c3f74954e2f7fcff16ac7e6f8';
const apiRouter = express.Router();

app.use(express.static('client'));
app.use(express.json());

/**
	Class for handling validation
*/
class Validation {
	constructor(){
		this.errors = [];
	}
	
	err(resource, field, validator, message){
		this.errors.push({resource:resource, field:field, validator:validator, message:message});
	}
	
	isNotNull(id, value, resource){
		if(value === undefined || value === null){
			this.err(resource, id, {'name':'null'}, resource + ' ' + id + ' must be completed.');
			return false;
		}
		return true;
	}
	
	isTime(id, value, resource){
		if(isNaN(new Date(value).getUTCMilliseconds())){
			this.err(resource, id, {'name':'time', 'format':'Y-m-d H:i:s'}, resource + ' ' + id + ' must be a valid time.');
			return false;
		}
		return true;
	}
	
	isValidLength(id, value, resource, minLength, maxLength){
		if(value.length > maxLength){
			this.err(resource, id, {'name':'length', 'max':maxLength, 'min':minLength}, resource + ' ' + id + ' must be at most ' + maxLength + ' characters long.');
			return false;
		}
		else if(value.length < minLength){
			this.err(resource, id, {'name':'length', 'max':maxLength, 'min':minLength}, resource + ' ' + id + ' must be at least ' + minLength + ' characters long.');
			return false;
		}
		return true;
	}
	
	hasErrors(){
		return this.errors.length > 0;
	}
}

/**
	Data entry store/validation class
*/
class Data {
	constructor(validation){
		this.fields = {};
		this.bodyFields = [];
		this.val = validation;
	}
	
	/**
		Set all fields to have the values provided in body if they are settable
	*/
	map(body){
		for(let i in this.bodyFields){
			let bodyField = this.bodyFields[i];
			this[bodyField] = body[bodyField];
		}
		return !this.val.hasErrors();
	}
	
	/**
		Modify bodyFields to only contain values that are set in body so that validation isn't failed for empty fields.
		Use in PATCH requests
	*/
	restrict(body){
		let newBodyFields = [];
		for(let i in this.bodyFields){
			if(body[this.bodyFields[i]] !== undefined){
				newBodyFields.push(this.bodyFields[i]);
			}
		}
		this.bodyFields = newBodyFields;
	}
}

class DataUser extends Data {
	constructor(validation){
		super(validation);
		this.fields = {
			'id':null,
			'email':null,
			'password':null,
			'firstName':null,
			'lastName':null,
			'access':null
		};
		this.bodyFields = ['email', 'firstName', 'lastName'];
	}
	
	set email(email){
		if(!this.val.isNotNull('email', email, 'User')){
			return false;
		}
		if(!this.val.isValidLength('email', email, 'User', 3, 254)){
			return false;
		}
		if(email.indexOf('@') < 0){
			this.val.err('User', 'email', {'name':'format', 'type':'email'}, 'User email address must contain an \'@\' symbol.');
			return false;
		}
		this.fields.email = email;
		return this;
	}
	
	async assignPassword(password){
		if(!this.val.isNotNull('password', password, 'User')){
			return false;
		}
		if(!this.val.isValidLength('password', password, 'User', 8, 100)){
			return false;
		}
		this.fields.password = await genPassword(password);
		return this;
	}
	
	set firstName(firstName){
		if(!this.val.isNotNull('firstName', firstName, 'User')){
			return false;
		}
		if(!this.val.isValidLength('firstName', firstName, 'User', 1, 50)){
			return false;
		}
		this.fields.firstName = firstName;
		return this;
	}
	
	set lastName(lastName){
		if(!this.val.isNotNull('lastName', lastName, 'User')){
			return false;
		}
		if(!this.val.isValidLength('lastName', lastName, 'User', 1, 50)){
			return false;
		}
		this.fields.lastName = lastName;
		return this;
	}
	
	set access(access){
		if(!this.val.isNotNull('access', access, 'User')){
			return false;
		}
		let validAccess = ['user', 'admin'];
		if(!validAccess.includes(access)){
			this.val.err('User', 'access', {'name':'match', 'allowed':validAccess}, 'User access must match value from list.');
			return false;
		}
	}
}

class DataTask extends Data {	
	constructor(validation){
		super(validation);
		this.fields = {
			'id':null,
			'userId':null,
			'name':null,
			'description':null,
			'timeStart':null,
			'timeEnd':null
		};
		this.bodyFields = ['name', 'description', 'timeStart', 'timeEnd'];
	}
	
	set name(name){
		if(!this.val.isNotNull('name', name, 'Task')){
			return false;
		}
		if(!this.val.isValidLength('name', name, 'Task', 1, 50)){
			return false;
		}
		this.fields.name = name;
		return this;
	}
	
	set description(description){
		if(!this.val.isNotNull('description', description, 'Task')){
			return false;
		}
		if(!this.val.isValidLength('description', description, 'Task', 0, 1000)){
			return false;
		}
		this.fields.description = description;
		return this;
	}
	
	set timeStart(timeStart){
		if(!this.val.isNotNull('timeStart', timeStart, 'Task')){
			return false;
		}
		if(!this.val.isTime('timeStart', timeStart, 'Task')){
			return false;
		}
		this.fields.timeStart = timeStart;
		return this;
	}
	
	set timeEnd(timeEnd){
		if(!this.val.isNotNull('timeEnd', timeEnd, 'Task')){
			return false;
		}
		if(!this.val.isTime('timeEnd', timeEnd, 'Task')){
			return false;
		}
		this.fields.timeEnd = timeEnd;
		return this;
	}	
}

class DataPlace extends Data {
	constructor(validation){
		super(validation);
		this.fields = {
			'id':null,
			'userId':null,
			'addressLine1':null,
			'addressLine2':null,
			'city':null,
			'county':null,
			'postcode':null,
			'country':null,
			'taskId':null
		};
		this.bodyFields = ['addressLine1', 'addressLine2', 'city', 'county', 'postcode', 'country', 'taskId'];
	}
	
	set addressLine1(addressLine1){
		if(!this.val.isNotNull('addressLine1', addressLine1, 'Place')){
			return false;
		}
		if(!this.val.isValidLength('addressLine1', addressLine1, 'Place', 1, 75)){
			return false;
		}
		this.fields.addressLine1 = addressLine1;
		return this;
	}
	
	set addressLine2(addressLine2){
		if(!this.val.isNotNull('addressLine2', addressLine2, 'Place')){
			return false;
		}
		if(!this.val.isValidLength('addressLine2', addressLine2, 'Place', 0, 75)){
			return false;
		}
		this.fields.addressLine2 = addressLine2;
		return this;
	}
	
	set city(city){
		if(!this.val.isNotNull('city', city, 'Place')){
			return false;
		}
		if(!this.val.isValidLength('city', city, 'Place', 1, 50)){
			return false;
		}
		this.fields.city = city;
		return this;
	}
	
	set county(county){
		if(!this.val.isNotNull('county', county, 'Place')){
			return false;
		}
		if(!this.val.isValidLength('county', county, 'Place', 1, 50)){
			return false;
		}
		this.fields.county = county;
		return this;
	}
	
	set postcode(postcode){
		if(!this.val.isNotNull('postcode', postcode, 'Place')){
			return false;
		}
		if(!this.val.isValidLength('postcode', postcode, 'Place', 1, 15)){
			return false;
		}
		this.fields.postcode = postcode;
		return this;
	}
	
	set country(country){
		if(!this.val.isNotNull('country', country, 'Place')){
			return false;
		}
		if(!this.val.isValidLength('country', country, 'Place', 2, 75)){
			return false;
		}
		this.fields.country = country;
		return this;
	}
	
	set taskId(taskId){
		if(!this.val.isNotNull('taskId', taskId, 'Place')){
			return false;
		}
		this.fields.taskId = taskId;
		return this;
	}
}

apiRouter.post('/users', async function(req, resp){
	req.accepts('json');
	resp.set('etag', false);
	let body = req.body;
	let user = new DataUser(new Validation());
	if(!user.map(body)){
		sendValidationError(resp, 400, 'Some fields in the request are invalid.', user.val.errors);
		return;
	}
	try {
		await user.assignPassword(body['password']);
	}
	catch(e){
		sendServerError(resp, e, 500);
		return;
	}
	if(user.val.hasErrors()){
		sendValidationError(resp, 400, 'Some fields in the request are invalid.', user.val.errors);
		return;
	}
	let additionalVerificationPassed = await additionalEmailValidation(user.fields.email, {
		'Content-Type': 'application/json',
		'Accept':'application/json',
		'user-id':null, //Replace with user id
		'api-key':null  //Replace with live API key
	});
	if(!additionalVerificationPassed){
		sendClientError(resp, 422, 'Email address has failed additional verification.');
		return;
	}
	user.fields.access = 'user';
	readJSONFile('users', function(users){
		for(let i in users){
			if(users[i].email === user.fields.email){
				sendClientError(resp, 409, 'A user with this email address already exists.');
				return;
			}
		}
		user.fields.id = uuidv4();
		users.push(user.fields);
		writeJSONFile('users', users, function(){
			delete user.fields.password;
			resp.status(201);
			resp.send(user.fields);
			return;
		});
	});
});

apiRouter.post('/auth', function(req, resp){
	req.accepts('json');
	resp.set('etag', false);
	readJSONFile('users', async function(users){
		for(let i in users){
			let user = users[i];
			if(user.email === req.body.email){
				let pwdMatch = null;
				try {
					pwdMatch = await passwordMatches(req.body.password, user.password);
					if(pwdMatch){
						delete user.password;
						let token = createAuth(user, resp);
						resp.status(201);
						resp.send({user:user, token:token});
						return;
					}
				}
				catch(e){
					sendServerError(resp, e);
					return;
				}
			}
		}
		sendClientError(resp, 401, 'Invalid email address or password.');
		return;
	}, resp);
});

apiRouter.use(function(req, resp, next) {
	let token = req.headers['authorization'];
	if (token) {
		jwt.verify(token, JWT_SECRET, function(err, decoded) {
			if (err) {
				sendClientError(resp, 401, 'Invalid or expired authorization token.');
				return;
			} else {
				req.jwtDecoded = decoded;
				next();
			}
		});
	} else {
		sendClientError(resp, 401, 'No authorization token provided.');
	}
});

apiRouter.get('/tasks', function(req, resp){
	readList('tasks', req, resp);
});

apiRouter.get('/places', function(req, resp){
	readList('places', req, resp);
});

apiRouter.get('/users', async function(req, resp){
	let currentUser = await getUser(req, resp);
	if(currentUser.access !== 'admin'){
		sendClientError(resp, 403, 'You do not have permission to list users.');
		return;
	}
	readJSONFile('users', async function(users){
		let filteredUsers = users;
		for(let i in filteredUsers){
			delete filteredUsers[i].password;
		}
		resp.send(filteredUsers);
	}, resp);
});

apiRouter.post('/tasks', function(req, resp){
	createItem('tasks', new DataTask(new Validation()), req, resp);
});

apiRouter.post('/places', function(req, resp){
	createItem('places', new DataPlace(new Validation()), req, resp, async function(place, body){
		try {
			let task = await getTask(body['taskId']);
			if(task){
				return true;
			}
			else {
				sendClientError(resp, 422, 'Task does not exist and cannot be linked to this place.');
				return false;
			}
		}
		catch(e){
			sendServerError(resp, e);
			return false;
		}		
	});
});

apiRouter.get('/users/:userId', function(req, resp){
	readJSONFile('users', async function(users){
		let currentUser = await getUser(req, resp);
		for(let i in users){
			let user = users[i];
			if(req.params['userId'] === user.id.toString()){
				if(user.id === currentUser.id || currentUser.access === 'admin'){
					delete user.password;
					return resp.send(user);
				}
				else {
					return sendClientError(resp, 403, 'You do not have permission to view this user.');
				}
			}
		}
		return sendClientError(resp, 404, 'User not found.');
	}, resp);
});

apiRouter.get('/tasks/:taskId', function(req, resp){
	readJSONFile('tasks', async function(tasks){
		let foundTask = false;
		let currentUser = await getUser(req, resp);
		for(let i in tasks){
			let task = tasks[i];
			if(req.params['taskId'] === task.id.toString()){
				if(task.userId === currentUser.id || currentUser.access === 'admin'){
					foundTask = task;
				}
				else {
					return sendClientError(resp, 403, 'You do not have permission to view this task.');
				}
			}
		}
		if(!foundTask){
			return sendClientError(resp, 404, 'Task not found.');
		}
		else {
			readJSONFile('places', function(places){
				let foundPlaces = [];
				for(let j in places){
					let place = places[j];
					if(foundTask.id === place.taskId){
						foundPlaces.push(place);
					}
				}
				foundTask.places = foundPlaces;
				resp.send(foundTask);
			}, resp);
		}
	}, resp);
});

apiRouter.get('/places/:placeId', function(req, resp){
	readItem('places', 'place', 'placeId', req, resp);
});

apiRouter.patch('/tasks/:taskId', function(req, resp){
	updateItem('tasks', 'task', 'taskId', new DataTask(new Validation()), req, resp);
});

apiRouter.patch('/places/:placeId', function(req, resp){
	if(req.body['taskId'] !== undefined){
		return sendClientError(resp, 422, 'You cannot change the taskId for a place.');
	}
	updateItem('places', 'place', 'placeId', new DataPlace(new Validation()), req, resp);
});

apiRouter.delete('/tasks/:taskId', function(req, resp){
	deleteItem('tasks', 'task', 'taskId', req, resp);
});

apiRouter.delete('/places/:placeId', function(req, resp){
	deleteItem('places', 'place', 'placeId', req, resp);
});

app.use('/api/v1', apiRouter);

/**
	Generalised function for getting a collection. Do not use for items that have no userId field
*/
function readList(resource, req, resp){
	readJSONFile(resource, async function(list){
		let listResponse = [];
		let currentUser = await getUser(req, resp);
		for(let i in list){
			let item = list[i];
			if(item.userId === currentUser.id || currentUser.access === 'admin'){
				listResponse.push(item);
			}
		}
		resp.send(listResponse);
	}, resp);
}

/**
	Generalised function for reading a resource. Do not use for items that have no userId field
*/
function readItem(resource, resourceName, urlParam, req, resp){
	readJSONFile(resource, async function(list){
		let currentUser = await getUser(req, resp);
		for(let i in list){
			let item = list[i];
			if(req.params[urlParam] === item.id.toString()){
				if(item.userId === currentUser.id || currentUser.access === 'admin'){
					return resp.send(item);
				}
				else {
					return sendClientError(resp, 403, 'You do not have permission to view this ' + resourceName + '.');
				}
			}
		}
		return sendClientError(resp, 404, ucfirst(resourceName) + ' not found.');
	}, resp);
}

/**
	Generalised function for creating a resource
*/
async function createItem(resource, dataClass, req, resp, preCreateCheck = null){
	req.accepts('json');
	resp.set('etag', false);
	let body = req.body;
	if(!dataClass.map(body)){
		return sendValidationError(resp, 400, 'Some fields in the request are invalid.', dataClass.val.errors);
	}
	if(preCreateCheck !== null){
		let ok = await preCreateCheck(dataClass, body);
		if(!ok) return;
	}
	readJSONFile(resource, function(list){
		dataClass.fields.id = uuidv4();
		dataClass.fields.userId = getUserId(req, resp);
		list.push(dataClass.fields);
		writeJSONFile(resource, list, function(){
			resp.status(201);
			return resp.send(dataClass.fields);
		});
	}, resp);
}

/**
	Generalised function for updating a resource
*/
function updateItem(resource, resourceName, urlParam, dataClass, req, resp){
	req.accepts('json');
	readJSONFile(resource, async function(list){
		let currentUser = await getUser(req, resp);
		let found = false;
		let index = -1;
		for(let i = 0; i < list.length && !found; i++){
			let item = list[i];
			if(req.params[urlParam] === item.id.toString()){
				found = item;
				index = i;
				if(item.userId !== currentUser.id && currentUser.access !== 'admin'){
					return sendClientError(resp, 403, 'You do not have permission to modify this ' + resourceName + '.');
				}
			}
		}
		if(!found){
			return sendClientError(resp, 404, ucfirst(resourceName) + ' not found.');
		}
		else {
			let body = req.body;
			let updatedItem = dataClass;
			updatedItem.fields = found;
			updatedItem.restrict(body);
			if(!updatedItem.map(body)){
				return sendValidationError(resp, 400, 'Some fields in the request are invalid.', updatedItem.val.errors);
			}
			list[index] = updatedItem.fields;
			writeJSONFile(resource, list, function(){
				return resp.send(list[index]);
			}, resp);
		}
	});
}

/**
	Generalised function for deleting a resource. Do not use for items that have no userId field
*/
function deleteItem(resource, resourceName, urlParam, req, resp){
	req.accepts('json');
	readJSONFile(resource, async function(list){
		let currentUser = await getUser(req, resp);
		let found = false;
		let newList = [];
		for(let i in list){
			let item = list[i];
			if(req.params[urlParam] === item.id.toString()){
				found = true;
				if(item.userId !== currentUser.id && currentUser.access !== 'admin'){
					return sendClientError(resp, 403, 'You do not have permission to delete this ' + resourceName + '.');
				}
			}
			else {
				newList.push(item);
			}
		}
		if(!found){
			return sendClientError(resp, 404, ucfirst(resourceName) + ' not found.');
		}
		else {
			writeJSONFile(resource, newList, function(){
				return resp.status(204).send();
			}, resp);
		}
	});
}

/**
	Use third party API to perform further checks on the email address.
	If no API is in the code then ignore the checks.
	This is a permissive function so on all failure conditions, it will assume the
	email address is valid and the burden of verification falls back to the app
*/
async function additionalEmailValidation(email, aHeaders){
	if(aHeaders['user-id'] === null || aHeaders['api-key'] === null){
		return true;
	}
	try {
		let response = await fetch('https://neutrinoapi.com/email-validate', {
			method:'POST',
			headers:aHeaders,
			body: JSON.stringify({
				'email':email
			})
		});
		let responseBody = await response.json();
		if(response.ok && responseBody.valid){
			return true;
		}
		else {
			return false;
		}
	}
	catch(e){
		console.err(e);
		return true;
	}
}

/**
	Make the first letter uppercase
*/
function ucfirst(str){
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
	Get the user id from JWT. This field has been injected by our routing middleware
*/
function getUserId(req){
	return req.jwtDecoded.id;
}

/**
	Get the user. Should never fail or the server messed up badly
*/
function getUser(req, resp){
	return new Promise(function(resolve, reject){
		let userId = getUserId(req, resp);
		readJSONFile('users', function(users){
			let found = false;
			for(let i in users){
				let user = users[i];
				if(user.id === userId){
					found = true;
					resolve(user);
					return;
				}
			}
			if(!found) reject(new Error('The user being processed suddenly vanished.'));
		}, resp);
	});
}

function getTask(taskId){
	return new Promise(function(resolve){
		readJSONFile('tasks', function(tasks){
			let found = false;
			for(let i in tasks){
				let task = tasks[i];
				if(task.id === taskId){
					found = task;
				}
			}
			resolve(found);
		});
	});
}

function genPassword(plaintext, saltRounds = 12){
	return new Promise(function(resolve, reject){
		bcrypt.hash(plaintext, saltRounds, function(err, hash) {
			if(!err){
				resolve(hash);
			}
			else {
				reject(new Error('Password generation failed.'));
			}
		});
	});
}

function readJSONFile(name, success = function(){}, resp){
	fs.readFile(dataPath + name + '.json', 'utf8', function(err, data){
		if(err){
			return sendServerError(resp, err);
		}
		if(data === ''){
			success([]);
		}
		else {
			success(JSON.parse(data));
		}
		return;
	});
}

function writeJSONFile(name, content, success = function(){}, resp){
	let writable = JSON.stringify(content);
	fs.writeFile(dataPath + name + '.json', writable, function(err){
		if(err){
			return sendServerError(resp, err);
		}
		success(writable);
		return;
	});
}

function passwordMatches(input, known){
	return new Promise(function(resolve, reject){
		bcrypt.compare(input, known, function(err, result){
			if(!err){
				resolve(result);
			}
			reject(err);
		});
	});
}

function createAuth(user){
	const payload = {
		id:user.id,
		access:user.access
	};
	let token = jwt.sign(payload, JWT_SECRET, {
		expiresIn: 60*60
	});
	return token;
}

function sendServerError(resp, err = null, code = 500, msg = 'A server error has occurred.'){
	console.err(err);
	if(resp.headersSent) return;
	resp.status(code);
	resp.send({error:msg, type:'server_error'});
}

function sendClientError(resp, code = 400, msg = 'A client error has occurred.', data = {}){
	if(resp.headersSent) return;
	resp.status(code);
	resp.send({error:msg, type:'client_error', data:data});
}

function sendValidationError(resp, code = 400, msg = 'Invalid data found in request body.', data){
	if(resp.headersSent) return;
	resp.status(code);
	resp.send({error:msg, type:'validation_error', data:data});
}

//Export list for JEST tests
module.exports = {
	app,
	Validation,
	Data,
	DataUser,
	DataPlace,
	DataTask,
	readList,
	readItem,
	createItem,
	updateItem,
	deleteItem,
	additionalEmailValidation,
	ucfirst,
	getUserId,
	getUser,
	getTask,
	genPassword,
	readJSONFile,
	writeJSONFile,
	passwordMatches,
	createAuth,
	sendServerError,
	sendClientError,
	sendValidationError
};