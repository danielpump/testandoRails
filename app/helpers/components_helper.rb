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
     (content_tag(:thead) do
        content_tag :tr do
          attributes.collect { |attribute|
            concat content_tag(:th, (t ".#{attribute}"))
          }.to_s.html_safe
        end
     end) <<
     (content_tag :tbody do
        models.collect { |model|
          concat content_tag :tr do
            attributes.collect { |attribute|
             content_tag(:td, model[attribute])
            }.to_s.html_safe  
          end         
        }.to_s.html_safe
     end)
   end
 end

end
