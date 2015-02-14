module ComponentsHelper
  def error_tag(model, attribute)
    if model.errors.has_key? attribute
      content_tag( :div, model.errors[attribute].first, class: 'error_message' )
    end
  end

  def form_text_input_field(form, model, attribute)
    content_tag(:div, :class => "form-group") do
      (form.label attribute, :class => "col-lg-full control-label") <<        
      (form.text_field attribute, :class => "form-control") <<  
      (error_tag(model, attribute))
    end
  end
  
  def form_submit_button(form)
    content_tag(:div, :class => "form-group") do
      (form.submit :class => "btn btn-default")
    end
  end
    
  def data_table(models, attributes = [])
      
      content_tag(:table, :class => "table table-striped table-hover") do
        content_tag(:thead) do
          content_tag(:tr) do
            attributes.each do |attribute|
              content_tag(:th) do
                #puts (">>>>>>>>>>>>> " << ("'.#{attribute}'")) 
                #puts (">>>>>>>>>>>>> " << (t "'.#{attribute}'"))
                #(t "'.#{attribute}'")
                ("Teste")
              end
            end
          end            
        end
        content_tag(:tdoby) do
          models.each do |model|        
            content_tag(:tr) do
              attributes.each do |attribute|
                content_tag(:td) do
                  puts model[attribute]
                  model[attribute]
                end
              end            
            end
          end    
        end
      end
      
  end

end
