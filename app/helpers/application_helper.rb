module ApplicationHelper
  def error_tag(model, attribute)
    if model.errors.has_key? attribute
      content_tag( :div, model.errors[attribute].first, class: 'error_message' )
    end
  end

  def form_text_input_field(model, attribute)
    content_tag(:div, :class => "form-group") do
      label_tag(attribute, nil, :class => "col-lg-2 control-label") <<
      text_field_tag(attribute, nil, :class => "form-control") <<
      error_tag(model, attribute)
    end
  end
  
  def form_submit_button()
    content_tag(:div, :class => "form-group") do
      #Ver como recuperar o nome da tela no botão
      submit_tag(nil,:class => "btn btn-primary")
    end
  end
    

end
