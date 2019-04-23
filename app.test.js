const request = require('supertest');
let src = require('./app');
expect.extend({
	toBeTypeOf(received, argument){
		const pass = (typeof received === argument);
		if (pass) {
			return {
				pass: true,
				message: () => `expected ${received} to be ${argument}`,
			};
		} else {
			return {
				pass: false,
				message: () => `expected ${received} to be ${argument}`,
			};
		}
	}
});
expect.extend({
	toBeArray(received){
		const pass = Array.isArray(received);
		if (pass) {
			return {
				pass: true,
				message: () => `expected ${received} to be array`,
			};
		} else {
			return {
				pass: false,
				message: () => `expected ${received} to be array`,
			};
		}
	}
});
describe('White box tests', function(){
	test('Creates a jwt string', function(){
		expect(src.createAuth({id:'test',access:'user'})).toBeTypeOf('string');
	});
	test('Password verification with bcrypt', function(){
		expect(src.passwordMatches('test', '$2b$12$2EP318hHvY0ng2sCb.kBze3V98xFgyI58suZSpI6tsv1V4dRhM6je')).resolves.toEqual(true);
	});
	test('Hashing password using bcrypt', function(){
		expect(src.genPassword('test')).resolves.toBeTypeOf('string');
	});
	test('Reading users json storage file', done => {
		function callback(data){
			expect(data).toBeArray();
			done();
		}
		src.readJSONFile('users', callback, {headersSent:true,status:function(){},send:function(){}});
	});
	test('Reading tasks json storage file', done => {
		function callback(data){
			expect(data).toBeArray();
			done();
		}
		src.readJSONFile('tasks', callback, {headersSent:true,status:function(){},send:function(){}});
	});
	test('Reading places json storage file', done => {
		function callback(data){
			expect(data).toBeArray();
			done();
		}
		src.readJSONFile('places', callback, {headersSent:true,status:function(){},send:function(){}});
	});
	test('Re-writing to users file', done => {
		let resp = {headersSent:true,status:function(){},send:function(){}};
		var testContent = [];
		function callback(data){
			expect(data).toBe(JSON.stringify(testContent));
			done();
		}
		src.readJSONFile('users', function(content){
			testContent = content;
			src.writeJSONFile('users', content, callback, resp);
		}, resp);
	});
	test('Re-writing to tasks file', done => {
		let resp = {headersSent:true,status:function(){},send:function(){}};
		var testContent = [];
		function callback(data){
			expect(data).toBe(JSON.stringify(testContent));
			done();
		}
		src.readJSONFile('tasks', function(content){
			testContent = content;
			src.writeJSONFile('tasks', content, callback, resp);
		}, resp);
	});
	test('Re-writing to places file', done => {
		let resp = {headersSent:true,status:function(){},send:function(){}};
		var testContent = [];
		function callback(data){
			expect(data).toBe(JSON.stringify(testContent));
			done();
		}
		src.readJSONFile('places', function(content){
			testContent = content;
			src.writeJSONFile('places', content, callback, resp);
		}, resp);
	});
	test('Making a string capitalized', function(){
		expect(src.ucfirst('test')).toBe('Test');
	});
	test('Making a string capitalized - already capitalized', function(){
		expect(src.ucfirst('Test')).toBe('Test');
	});
	test('Additional email validation with no API details', async function(){
		let result = await src.additionalEmailValidation('test@example.com', {'user-id':null});
		expect(result).toBe(true);
	});
	test('Validating a user, all valid', function(){
		let user = new src.DataUser(new src.Validation());
		expect(user.map({
			email:'test@example',
			firstName:'test',
			lastName:'test'
		})).toBe(true);
	});
	test('Validating a user, email missing \'@\'', function(){
		let user = new src.DataUser(new src.Validation());
		expect(user.map({
			email:'test',
			firstName:'test',
			lastName:'test'
		})).toBe(false);
	});
	test('Validating a task, all valid', function(){
		let task = new src.DataTask(new src.Validation());
		expect(task.map({
			name:'test',
			description:'test',
			timeStart:'2019-01-01 00:00:00',
			timeEnd:'2019-01-01 00:00:00'
		})).toBe(true);
	});
	test('Validating a task, time missing date part', function(){
		let task = new src.DataTask(new src.Validation());
		expect(task.map({
			name:'test',
			description:'test',
			timeStart:'00:00:00',
			timeEnd:'2019-01-01 00:00:00'
		})).toBe(false);
	});
	test('Validating a place, all valid', function(){
		let place = new src.DataPlace(new src.Validation());
		expect(place.map({
			addressLine1:'test',
			addressLine2:'',
			city:'test',
			county:'test',
			postcode:'123',
			country:'UK',
			taskId:1
		})).toBe(true);
	});
	test('Validating a place, country too short', function(){
		let place = new src.DataPlace(new src.Validation());
		expect(place.map({
			addressLine1:'test',
			addressLine2:'',
			city:'test',
			county:'test',
			postcode:'123',
			country:'U',
			taskId:1
		})).toBe(false);
	});
});
describe('Black box tests', function(){
	test('GET /', function(){
		return request(src.app).get('/').expect(200).expect('Content-Type', /html/);
	});
	test('GET /api/v1/tasks missing auth', function(){
		return request(src.app).get('/api/v1/tasks').expect(401);
	});
	let token = null;
	let users = [];
	beforeAll(function(done){
		let resp = {headersSent:true,status:function(){},send:function(){}};
		src.readJSONFile('users', function(data){
			users = data;
			let newUsers = [{'id':1,'email':'test@example.com','password':'$2b$12$2EP318hHvY0ng2sCb.kBze3V98xFgyI58suZSpI6tsv1V4dRhM6je','firstName':'Test','lastName':'Tester','access':'admin'}];
			src.writeJSONFile('users', newUsers, function(){
				request(src.app).post('/api/v1/auth').send({email:'test@example.com',password:'test'}).end(function(err, res){
					token = res.body.token;
					done();
				});
			}, resp);
		}, resp);
	});
	test('POST /api/v1/auth', function(){
		return request(src.app)
			.post('/api/v1/auth')
			.send({email:'test@example.com', password:'test'})
			.set({ 'Authorization': token, Accept: 'application/json', 'Content-Type': 'application/json' })
			.expect(201)
			.expect('Content-Type', /json/);
	});
	test('POST /api/v1/auth bad password', function(){
		return request(src.app)
			.post('/api/v1/auth')
			.send({email:'test@example.com', password:'test1234'})
			.set({ 'Authorization': token, Accept: 'application/json', 'Content-Type': 'application/json' })
			.expect(401)
			.expect('Content-Type', /json/);
	});
	test('GET /api/v1/tasks collection', function(){
		return request(src.app)
			.get('/api/v1/tasks')
			.set({ 'Authorization': token, Accept: 'application/json' })
			.expect(200)
			.expect('Content-Type', /json/);
	});
	test('GET /api/v1/places collection', function(){
		return request(src.app)
			.get('/api/v1/places')
			.set({ 'Authorization': token, Accept: 'application/json' })
			.expect(200)
			.expect('Content-Type', /json/);
	});
	test('POST /api/v1/tasks collection success', function(){
		return request(src.app)
			.post('/api/v1/tasks')
			.send({name:'Test', description:'Test', timeStart:'2019-01-01 00:00:00', timeEnd:'2019-01-01 00:00:00'})
			.set({ 'Authorization': token, Accept: 'application/json', 'Content-Type': 'application/json' })
			.expect(201)
			.expect('Content-Type', /json/);
	});
	test('POST /api/v1/tasks collection validation failure', function(){
		return request(src.app)
			.post('/api/v1/tasks')
			.send({})
			.set({ 'Authorization': token, Accept: 'application/json' })
			.expect(400)
			.expect('Content-Type', /json/);
	});
	let tasks = null;
	let places = null;
	beforeEach(function(done){
		let resp = {headersSent:true,status:function(){},send:function(){}};
		src.readJSONFile('tasks', function(data){
			if(tasks === null){
				tasks = data;
			}
			let newTasks = [{'id':'c270ac63-6ec4-4301-af39-084e7ad629b6','userId':1,'name':'Test','description':'Test','timeStart':'2019-01-01 00:00:00','timeEnd':'2019-01-01 00:00:00'}];
			src.writeJSONFile('tasks', newTasks, function(){
				done();
			}, resp);
		}, resp);
	});
	beforeEach(function(done){
		let resp = {headersSent:true,status:function(){},send:function(){}};
		src.readJSONFile('places', function(data){
			if(places === null){
				places = data;
			}
			let newPlaces = [{'id':'4e288a34-5914-411a-a6a2-0161462db4c7','userId':1,'addressLine1':'A','addressLine2':'','city':'A','county':'A','postcode':'1','country':'UK','taskId':'c270ac63-6ec4-4301-af39-084e7ad629b6'}];
			src.writeJSONFile('places', newPlaces, function(){
				done();
			}, resp);
		}, resp);
	});
	test('POST /api/v1/places collection success', function(){
		return request(src.app)
			.post('/api/v1/places')
			.send({'addressLine1':'Another Test','addressLine2':'','city':'A','county':'A','postcode':'1','country':'UK','taskId':'c270ac63-6ec4-4301-af39-084e7ad629b6'})
			.set({ 'Authorization': token, Accept: 'application/json', 'Content-Type': 'application/json' })
			.expect(201)
			.expect('Content-Type', /json/);
	});
	test('POST /api/v1/places collection missing taskId', function(){
		return request(src.app)
			.post('/api/v1/places')
			.send({'addressLine1':'A','addressLine2':'','city':'A','county':'A','postcode':'1','country':'UK'})
			.set({ 'Authorization': token, Accept: 'application/json' })
			.expect(400)
			.expect('Content-Type', /json/);
	});
	test('PATCH /api/v1/tasks/c270ac63-6ec4-4301-af39-084e7ad629b6' + ' resource success', function(){
		return request(src.app)
			.patch('/api/v1/tasks/c270ac63-6ec4-4301-af39-084e7ad629b6')
			.send({})
			.set({ 'Authorization': token, Accept: 'application/json', 'Content-Type': 'application/json' })
			.expect(200)
			.expect('Content-Type', /json/);
	});
	test('PATCH /api/v1/tasks/c270ac63-6ec4-4301-af39-084e7ad629b6' + ' resource failure', function(){
		return request(src.app)
			.patch('/api/v1/tasks/c270ac63-6ec4-4301-af39-084e7ad629b6')
			.send({'name':''})
			.set({ 'Authorization': token, Accept: 'application/json', 'Content-Type': 'application/json' })
			.expect(400)
			.expect('Content-Type', /json/);
	});
	test('DELETE /api/v1/tasks/c270ac63-6ec4-4301-af39-084e7ad629b6' + ' resource success', function(){
		return request(src.app)
			.delete('/api/v1/tasks/c270ac63-6ec4-4301-af39-084e7ad629b6')
			.set({ 'Authorization': token, Accept: 'application/json' })
			.expect(204);
	});
	test('PATCH /api/v1/places/4e288a34-5914-411a-a6a2-0161462db4c7' + ' resource success', function(done){
		return request(src.app)
			.patch('/api/v1/places/4e288a34-5914-411a-a6a2-0161462db4c7')
			.send({'country':'US'})
			.set({ 'Authorization': token, Accept: 'application/json', 'Content-Type': 'application/json' })
			.expect(200)
			.expect('Content-Type', /json/)
			.end(function(err, res){
				expect(res.body.country).toBe('US');
				done();
			});
	});
	test('PATCH /api/v1/places/4e288a34-5914-411a-a6a2-0161462db4c7' + ' resource failure', function(){
		return request(src.app)
			.patch('/api/v1/places/4e288a34-5914-411a-a6a2-0161462db4c7')
			.send({'country':''})
			.set({ 'Authorization': token, Accept: 'application/json', 'Content-Type': 'application/json' })
			.expect(400)
			.expect('Content-Type', /json/);
	});
	test('DELETE /api/v1/places/4e288a34-5914-411a-a6a2-0161462db4c7' + ' resource success', function(){
		return request(src.app)
			.delete('/api/v1/places/4e288a34-5914-411a-a6a2-0161462db4c7')
			.set({ 'Authorization': token, Accept: 'application/json' })
			.expect(204);
	});
	afterAll(function(done){
		let resp = {headersSent:true,status:function(){},send:function(){}};
		src.writeJSONFile('users', users, function(){
			done();
		}, resp);
	});
	afterAll(function(done){
		let resp = {headersSent:true,status:function(){},send:function(){}};
		src.writeJSONFile('tasks', tasks === null ? [] : tasks, function(){
			done();
		}, resp);
	});
	afterAll(function(done){
		let resp = {headersSent:true,status:function(){},send:function(){}};
		src.writeJSONFile('places', places === null ? [] : places, function(){
			done();
		}, resp);
	});
});