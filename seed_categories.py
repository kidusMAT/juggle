import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from juggle.models import Category

def seed_categories():
    data = [
        ('Fashion', 'layers', [
            ('Shoes', 'footprints'),
            ('Clothing', 'shirt'),
            ('Accessories', 'watch')
        ]),
        ('Tech', 'cpu', [
            ('Smartphones', 'smartphone'),
            ('Laptops', 'laptop'),
            ('Gaming', 'gamepad-2')
        ]),
        ('Home', 'home', [
            ('Furniture', 'armchair'),
            ('Kitchen', 'utensils'),
            ('Decor', 'leaf')
        ])
    ]

    for p_name, p_icon, subs in data:
        p_cat, _ = Category.objects.get_or_create(name=p_name, defaults={'icon': p_icon})
        for s_name, s_icon in subs:
            Category.objects.get_or_create(name=s_name, parent=p_cat, defaults={'icon': s_icon})
    
    print("Categories seeded successfully!")

if __name__ == '__main__':
    seed_categories()
