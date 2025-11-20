require 'sinatra'
require 'sinatra/activerecord'
require 'json'
require 'securerandom'
require 'logger'

set :database_file, File.expand_path('config/database.yml', __dir__)
set :show_exceptions, false

class User < ActiveRecord::Base
  has_many :todos, dependent: :destroy

  validates :username, presence: true, uniqueness: true
end

class Todo < ActiveRecord::Base
  belongs_to :user

  validates :title, presence: true
end

before do
  content_type :json
end

error ActiveRecord::RecordInvalid do
  status 422
  { errors: env['sinatra.error'].record.errors.full_messages }.to_json
end

error ActiveRecord::RecordNotFound do
  status 404
  { error: 'Resource not found' }.to_json
end

helpers do
  def json_params
    body = request.body.read
    return {} if body.nil? || body.strip.empty?

    JSON.parse(body)
  rescue JSON::ParserError
    halt 400, { error: 'Invalid JSON payload' }.to_json
  end

  def find_user!(username)
    User.find_by(username: username) || halt(404, { error: 'User not found' }.to_json)
  end

  def find_todo!(user, id)
    user.todos.find_by(id: id) || halt(404, { error: 'Todo not found' }.to_json)
  end

  def serialize_todo(todo)
    {
      id: todo.id,
      title: todo.title,
      description: todo.description,
      completed: todo.completed,
      created_at: todo.created_at,
      updated_at: todo.updated_at
    }
  end

  def generate_username
    50.times do
      candidate = SecureRandom.alphanumeric(6).downcase
      return candidate unless User.exists?(username: candidate)
    end

    halt 500, { error: 'Unable to generate unique username' }.to_json
  end

  def apply_updates(todo, attrs)
    allowed = %w[title description completed]
    permitted = attrs.each_with_object({}) do |(key, value), memo|
      next unless allowed.include?(key)
      memo[key] = value
    end

    todo.assign_attributes(permitted)
    todo.completed = !!todo.completed if permitted.key?('completed')
  end
end

get '/' do
  { service: 'todo-api', status: 'ok' }.to_json
end

post '/users/create' do
  username = generate_username
  user = User.create!(username: username)

  status 201
  {
    username: user.username,
    instructions: "Use this username from now on to access this session's todos."
  }.to_json
end

get '/todos/:username' do
  user = find_user!(params[:username])
  todos = user.todos.order(:created_at).map { |todo| serialize_todo(todo) }

  { username: user.username, todos: todos }.to_json
end

post '/todos/:username' do
  user = find_user!(params[:username])
  attrs = json_params

  todo = user.todos.new(
    title: attrs['title'],
    description: attrs['description'],
    completed: attrs.fetch('completed', false)
  )

  if todo.save
    status 201
    serialize_todo(todo).to_json
  else
    halt 422, { errors: todo.errors.full_messages }.to_json
  end
end

get '/todos/:username/:id' do
  user = find_user!(params[:username])
  todo = find_todo!(user, params[:id])

  serialize_todo(todo).to_json
end

put '/todos/:username/:id' do
  update_todo(params[:username], params[:id], json_params, replace: true)
end

patch '/todos/:username/:id' do
  update_todo(params[:username], params[:id], json_params, replace: false)
end

delete '/todos/:username/:id' do
  user = find_user!(params[:username])
  todo = find_todo!(user, params[:id])
  todo.destroy

  status 204
end

def update_todo(username, todo_id, attrs, replace:)
  user = find_user!(username)
  todo = find_todo!(user, todo_id)

  if replace && !attrs.key?('title')
    halt 422, { errors: ['Title is required for full updates'] }.to_json
  end

  apply_updates(todo, attrs)

  if todo.save
    serialize_todo(todo).to_json
  else
    halt 422, { errors: todo.errors.full_messages }.to_json
  end
end
