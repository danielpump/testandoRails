class Cliente < ActiveRecord::Base
  
    validates_presence_of :razaosocial, :nomefantasia, :tipo, :documento, :telefone
    validates_uniqueness_of :documento
    
    validate :formato_do_documento
    
    private
    
    def formato_do_documento
      #Validar se o formato do documento confere com CNPJ ou CPF
    end
  
end
