class CreateClientes < ActiveRecord::Migration
  def change
    create_table :clientes do |t|
      t.string :razaosocial
      t.string :nomefantasia
      t.string :tipo
      t.string :documento
      t.string :telefone
      
      t.index :documento , unique: true

      t.timestamps
    end
  end
end
