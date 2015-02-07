json.array!(@clientes) do |cliente|
  json.extract! cliente, :id, :razaosocial, :nomefantasia, :tipo, :documento, :telefone
  json.url cliente_url(cliente, format: :json)
end
